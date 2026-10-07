import json
import logging
import secrets
from apps.flows.utils import flatten_dict

import requests
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import RequirePermission, Permission
from apps.core.scoping import scope_by_owner
from apps.whatsapp.models import WhatsappInstance

from .models import WhatsappFlow, FlowSubmission
from .serializers import WhatsappFlowSerializer, WhatsappFlowListSerializer, FlowSubmissionSerializer
from .crypto import decrypt_flow_request, encrypt_flow_response
from .utils import clean_flow_json

logger = logging.getLogger(__name__)



# Flow CRUD ViewSet
# ──────────────────────────────────────────────
class WhatsappFlowViewSet(viewsets.ModelViewSet):
    """
    CRUD for WhatsApp Flow definitions.
    GET    /api/flows/           → list all flows (lightweight)
    POST   /api/flows/           → create + optionally push to Meta
    GET    /api/flows/<id>/      → detail with full flow_json
    PUT    /api/flows/<id>/      → update
    DELETE /api/flows/<id>/      → delete (+ optionally from Meta)
    POST   /api/flows/<id>/publish/   → publish to Meta
    POST   /api/flows/<id>/sync/      → sync status from Meta
    """
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_AUTOMATIONS


    def get_queryset(self):
        return scope_by_owner(
            WhatsappFlow.objects.select_related("instance").all(),
            self.request.user,
            owner_field="instance__user",
        )


    def get_serializer_class(self):
        if self.action == "list":
            return WhatsappFlowListSerializer
        return WhatsappFlowSerializer


    def perform_create(self, serializer):
        """Save flow locally, then optionally create on Meta."""
        instance_obj = serializer.validated_data.get("instance")
        endpoint_uri = self._build_endpoint_uri()
        flow = serializer.save(endpoint_uri=endpoint_uri)

        # Push to Meta if instance has credentials
        if instance_obj and instance_obj.access_token and instance_obj.whatsapp_business_account_id:
            self._create_on_meta(flow, instance_obj)


    def perform_destroy(self, instance):
        """Delete from Meta first, then locally."""
        if instance.meta_flow_id and instance.instance.access_token:
            self._delete_from_meta(instance)
        instance.delete()


    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish a DRAFT flow to Meta."""
        flow = self.get_object()
        if not flow.meta_flow_id:
            return Response({"error": "Flow not yet created on Meta. Save the flow first."}, status=400)

        instance_obj = flow.instance
        url = f"{settings.META_GRAPH_API_BASE_URL}/{flow.meta_flow_id}/publish"
        headers = {
            "Authorization": f"Bearer {instance_obj.access_token}",
            "Content-Type": "application/json",
        }
        res = requests.post(url, headers=headers)
        if res.status_code == 200:
            flow.status = WhatsappFlow.FlowStatus.PUBLISHED
            flow.save(update_fields=["status", "updated_at"])
            return Response({"status": "published", "meta_flow_id": flow.meta_flow_id})

        logger.error("[FlowViewSet] Meta publish failed: %s", res.text)
        return Response({"error": "Meta API error", "detail": res.json()}, status=res.status_code)


    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        """Sync flow status from Meta."""
        flow = self.get_object()
        if not flow.meta_flow_id:
            return Response({"error": "No meta_flow_id"}, status=400)

        instance_obj = flow.instance
        url = f"{settings.META_GRAPH_API_BASE_URL}/{flow.meta_flow_id}"
        headers = {"Authorization": f"Bearer {instance_obj.access_token}"}
        res = requests.get(url, headers=headers, params={"fields": "id,name,status,preview"})

        if res.status_code == 200:
            data = res.json()
            flow.status = data.get("status", flow.status)
            preview = data.get("preview", {})
            flow.preview_url = preview.get("preview_url", flow.preview_url)
            flow.save(update_fields=["status", "preview_url", "updated_at"])
            return Response(WhatsappFlowSerializer(flow).data)

        return Response({"error": "Meta API error", "detail": res.json()}, status=res.status_code)


    @action(detail=True, methods=["post"], url_path="upload-json")
    def upload_json(self, request, pk=None):
        """Push updated flow_json to Meta as an asset upload."""
        flow = self.get_object()
        if not flow.meta_flow_id:
            return Response({"error": "Flow not yet on Meta."}, status=400)

        instance_obj = flow.instance
        
        # Auto-sanitize the JSON before pushing to Meta.
        # Pass data_api_config so dynamic dropdown data-source references and
        # screen data schemas are repaired automatically.
        cleaned_json, changed = clean_flow_json(
            flow.flow_json,
            data_api_config=flow.data_api_config or {},
        )
        if changed:
            flow.flow_json = cleaned_json
            flow.save(update_fields=["flow_json", "updated_at"])
            
        flow_json_bytes = json.dumps(cleaned_json).encode("utf-8")


        url = f"{settings.META_GRAPH_API_BASE_URL}/{flow.meta_flow_id}/assets"
        headers = {"Authorization": f"Bearer {instance_obj.access_token}"}

        files = {
            "file": ("flow.json", flow_json_bytes, "application/json"),
            "name": (None, "flow.json"),
            "asset_type": (None, "FLOW_JSON"),
        }
        res = requests.post(url, headers=headers, files=files)

        if res.status_code == 200:
            data = res.json()
            if data.get("validation_errors"):
                logger.error("[FlowViewSet] Meta JSON validation errors: %s", data["validation_errors"])
                return Response({
                    "error": "Flow JSON validation failed", 
                    "detail": data["validation_errors"]
                }, status=400)
            return Response({"status": "uploaded", "success": True})
            
        logger.error("[FlowViewSet] Meta upload failed: %s", res.text)
        return Response({"error": "Meta API error", "detail": res.json()}, status=res.status_code)


    # Private helpers ────────────────────────────────────────────────────
    def _build_endpoint_uri(self):
        base = getattr(settings, "BACKEND_PUBLIC_URL", "").rstrip("/")
        return f"{base}/api/flows/wa/data-exchange/" if base else ""

    def _create_on_meta(self, flow: WhatsappFlow, instance_obj: WhatsappInstance):
        url = f"{settings.META_GRAPH_API_BASE_URL}/{instance_obj.whatsapp_business_account_id}/flows"
        headers = {
            "Authorization": f"Bearer {instance_obj.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "name": flow.name,
            "categories": [flow.category],
            "endpoint_uri": flow.endpoint_uri,
        }
        res = requests.post(url, json=payload, headers=headers)
        if res.status_code in (200, 201):
            meta_data = res.json()
            flow.meta_flow_id = meta_data.get("id", "")
            flow.save(update_fields=["meta_flow_id", "updated_at"])
            logger.info("[FlowViewSet] Created on Meta: %s → %s", flow.name, flow.meta_flow_id)
        else:
            logger.warning("[FlowViewSet] Meta create failed: %s", res.text)

    def _delete_from_meta(self, flow: WhatsappFlow):
        url = f"{settings.META_GRAPH_API_BASE_URL}/{flow.meta_flow_id}"
        headers = {"Authorization": f"Bearer {flow.instance.access_token}"}
        try:
            requests.delete(url, headers=headers)
        except Exception as exc:
            logger.warning("[FlowViewSet] Meta delete failed: %s", exc)


# Flow Submissions
# ─────────────────────────────────────
class FlowSubmissionListView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_AUTOMATIONS

    def get(self, request):
        qs = FlowSubmission.objects.select_related("flow", "conversation").all()

        flow_id = request.query_params.get("flow")
        if flow_id:
            qs = qs.filter(flow_id=flow_id)

        qs = scope_by_owner(qs, request.user, owner_field="flow__instance__user")
        serializer = FlowSubmissionSerializer(qs, many=True)
        return Response(serializer.data)


class PreviewApiView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_AUTOMATIONS

    def post(self, request):
        cfg = request.data
        url = cfg.get("url", "").strip()
        if not url:
            return Response({"error": "url is required"}, status=400)

        id_field    = cfg.get("id_field", "id") or "id"
        label_field = cfg.get("label_field", "name") or "name"
        results_key = cfg.get("results_key", "") or ""
        headers     = cfg.get("headers", {}) or {}
        filter_param = cfg.get("filter_param", "") or ""
        filter_value = cfg.get("filter_value", "") or ""  

        params = {}
        if filter_param and filter_value:
            params[filter_param] = filter_value

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            raw = resp.json()

        except requests.exceptions.Timeout:
            return Response({"error": "API timed out after 10 seconds"}, status=408)
        except requests.exceptions.ConnectionError as exc:
            return Response({"error": f"Could not connect: {exc}"}, status=502)
        except Exception as exc:
            return Response({"error": str(exc)}, status=502)

        # Navigate nested key path
        items = raw
        if results_key:
            for key in results_key.split("."):
                if isinstance(items, dict):
                    items = items.get(key, [])

        if not isinstance(items, list):
            hint = ""
            if isinstance(items, dict) and items:
                hint = f" Available keys: {', '.join(items.keys())}."
            return Response({"error": f"Expected a list but got {type(items).__name__}.{hint} Check your Results Key.", "raw": raw}, status=422)

        # Extract keys from the first non-empty item
        first_item = next((item for item in items if isinstance(item, dict)), None)
        keys = list(flatten_dict(first_item).keys()) if first_item else []

        options = []
        for item in items:
            if not isinstance(item, dict):
                continue
            opt_id    = item.get(id_field, "")
            opt_label = item.get(label_field, str(opt_id))
            if opt_id:
                options.append({"id": str(opt_id), "title": str(opt_label)})

        return Response({"count": len(options), "options": options[:50], "keys": keys, "raw": raw})



class FlowFieldsView(APIView):
    """
    Return all field names (form variable keys) for a given WhatsApp Flow.
    """
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_AUTOMATIONS

    FIELD_TYPES = {"TextInput", "TextArea", "Dropdown", "RadioButtonsGroup", "CheckboxGroup", "DatePicker"}

    def get(self, request, flow_id):
        try:
            flow = WhatsappFlow.objects.get(id=flow_id)
        except WhatsappFlow.DoesNotExist:
            return Response({"error": "Flow not found"}, status=404)

        fields: set[str] = set()

        # Extract from flow_json component names 
        fj = flow.flow_json or {}
        for screen in fj.get("screens", []):
            layout = screen.get("layout", {})
            self._walk_children(layout.get("children", []), fields)

        # Supplement with keys from real submissions 
        latest_sub = (
            FlowSubmission.objects.filter(flow=flow, completed=True)
            .order_by("-created_at").first()
        )
        if latest_sub and isinstance(latest_sub.screen_data, dict):
            fields.update(latest_sub.screen_data.keys())

        return Response({"flow_id": str(flow_id), "fields": sorted(fields)})

    def _walk_children(self, children, fields: set):
        for comp in children:
            if not isinstance(comp, dict):
                continue
            if comp.get("type") in self.FIELD_TYPES:
                name = comp.get("name") or comp.get("id", "")
                if name:
                    fields.add(name)
            # Recurse into Form wrappers and nested children
            self._walk_children(comp.get("children", []), fields)



# Data Exchange Endpoint — called by Meta for every screen interaction
# ─────────────────────────────────────────────────────────────────────
@method_decorator(csrf_exempt, name="dispatch")
class FlowDataExchangeView(View):

    def post(self, request, *args, **kwargs):
        raw_body = request.body

        # Health-check: Meta may send an unencrypted ping
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return HttpResponse("Bad Request", status=400)

        # Unencrypted health ping
        if body.get("action") == "ping" and "encrypted_flow_data" not in body:
            return JsonResponse({"version": "3.0", "data": {"status": "active"}})

        # Encrypted payload
        aes_key = None
        iv      = None
        try:
            decrypted, aes_key, iv = decrypt_flow_request(body)
        except Exception as exc:
            logger.error("[FlowDataExchange] Decryption failed: %s", exc)
            return JsonResponse({"error": "decryption_failed"}, status=421)

        action_name = decrypted.get("action", "")
        screen      = decrypted.get("screen", "")
        flow_token  = decrypted.get("flow_token", "")
        data        = decrypted.get("data", {})

        logger.info(
            "[FlowDataExchange] action=%s screen=%s token=%s",
            action_name, screen, flow_token[:8] if flow_token else "",
        )

        # Ping (encrypted)
        if action_name == "ping":
            response_data = {"version": "3.0", "data": {"status": "active"}}
            encrypted = encrypt_flow_response(response_data, aes_key, iv)
            return HttpResponse(encrypted, content_type="text/plain")

        if action_name == "INIT":
            response_data = self._handle_init(flow_token, data)

        elif action_name == "data_exchange":
            response_data = self._handle_screen(screen, flow_token, data)

        else:
            logger.warning("[FlowDataExchange] Unknown action: %s", action_name)
            response_data = {"screen": "ERROR", "data": {}}

        if isinstance(response_data, dict):
            response_data["version"] = "3.0"
            
        encrypted = encrypt_flow_response(response_data, aes_key, iv)
        return HttpResponse(encrypted, content_type="text/plain")


    # ── Screen handlers ──────────────────────────────────────
    def _handle_init(self, flow_token: str, data: dict) -> dict:
        """
        Called when the Flow first opens.
        Pre-populate fields using execution variables if available.
        """
        flow_obj = self._find_flow_by_token_cached(flow_token)
        if not flow_obj:
            logger.warning(
                "[FlowDataExchange] INIT: No FlowSubmission for token %s — "
                "attempting fallback lookup by meta_flow_id.",
                flow_token[:8],
            )

        first_screen = "SEARCH"
        if flow_obj and flow_obj.flow_json and flow_obj.flow_json.get("screens"):
            first_screen = flow_obj.flow_json["screens"][0].get("id", "SEARCH")

        prefill = self._get_prefill_from_execution(flow_token)

        # ── Fetch dynamic options for the first screen ──
        api_config = getattr(flow_obj, "data_api_config", {}) if flow_obj else {}
        extra_data = {}
        for field_name, cfg in api_config.items():
            cfg_screen = cfg.get("screen", first_screen)
            if cfg_screen == first_screen:
                options = self._fetch_dynamic_options(cfg, submitted_data={**data, **prefill})
                extra_data[f"{field_name}_options"] = options
                logger.info(
                    "[FlowDataExchange] INIT: fetched %d options for field '%s' (screen=%s)",
                    len(options), field_name, first_screen,
                )

        if not extra_data and api_config:
            logger.warning(
                "[FlowDataExchange] INIT: api_config has %d entries but none matched "
                "first_screen='%s'. Config screens: %s",
                len(api_config),
                first_screen,
                {k: v.get('screen') for k, v in api_config.items()},
            )

        return {
            "screen": first_screen,
            "data": {
                **prefill,
                **extra_data,
            },
        }


    def _handle_screen(self, screen: str, flow_token: str, data: dict) -> dict:
        """
        For screens with dynamic dropdowns, call the configured API.

        The footer on-click-action sends: { screen: <nextScreenId>, ...formValues }
        so the *next* screen to render is always data["screen"].
        """

        next_screen = data.get("screen", screen)
        if next_screen == "COMPLETE" or screen == "COMPLETE":
            return self._handle_complete(flow_token, data)

        # Load the flow's API config
        flow_obj = self._find_flow_by_token_cached(flow_token)
        if not flow_obj:
            logger.warning(
                "[FlowDataExchange] SCREEN: No FlowSubmission for token %s — "
                "dynamic options will be skipped.",
                flow_token[:8],
            )

        api_config = getattr(flow_obj, "data_api_config", {}) if flow_obj else {}

        # Fetch dynamic options for every configured field on the next screen
        extra_data = {}
        for field_name, cfg in api_config.items():
            target_screen = cfg.get("screen", next_screen)
            if target_screen != next_screen:
                continue

            options = self._fetch_dynamic_options(cfg, submitted_data=data)
            extra_data[f"{field_name}_options"] = options
            logger.info(
                "[FlowDataExchange] SCREEN: fetched %d options for field '%s' → screen=%s",
                len(options), field_name, next_screen,
            )

        logger.info(
            "[FlowDataExchange] SCREEN: action=data_exchange current=%s next=%s "
            "extra_keys=%s",
            screen, next_screen, list(extra_data.keys()),
        )

        return {
            "screen": next_screen,
            "data": {
                **data,
                **extra_data,
            },
        }


    # ── Dynamic API caller ───────────────────────────────────────────────────
    def _fetch_dynamic_options(self, cfg: dict, submitted_data: dict, for_enrichment: bool = False) -> list:
    
        url         = cfg.get("url", "")
        id_field    = cfg.get("id_field", "id")
        label_field = cfg.get("label_field", "name")
        headers     = cfg.get("headers", {})
        results_key = cfg.get("results_key", "")    
        filter_param  = cfg.get("filter_param", "") 
        filter_qkey   = cfg.get("filter_query_key", filter_param)  

        if not url:
            return []

        params = {}
        if filter_param and filter_param in submitted_data:
            params[filter_qkey] = submitted_data[filter_param]

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=8)
            resp.raise_for_status()
            raw = resp.json()
        except Exception as exc:
            logger.error("[FlowDataExchange] API fetch failed for %s: %s", url, exc)
            return []

        # Navigate nested keys
        items = raw
        if results_key:
            for key in results_key.split("."):
                if isinstance(items, dict):
                    items = items.get(key, [])

        if not isinstance(items, list):
            items = []

        options = []
        for item in items:
            if not isinstance(item, dict):
                continue
            opt_id    = item.get(id_field, "")
            opt_label = item.get(label_field, str(opt_id))
            if opt_id:
                opt = {"id": str(opt_id), "title": str(opt_label)}
                if for_enrichment and "uuid" in item:
                    opt["uuid"] = str(item["uuid"])
                options.append(opt)

        return options


    # ── Cached flow lookup ───────────────────────────────────────────────────
    def _find_flow_by_token_cached(self, flow_token: str):
        """
        Look up the WhatsappFlow from a FlowSubmission.
        Cached per request.

        Fallback: If no FlowSubmission is found (e.g. QR code preview or
        a manually-sent flow), try to match by meta_flow_id.  Meta's preview
        tokens are random strings, so this fallback only works when the caller
        passed the meta_flow_id itself as the token — otherwise we return None
        and log a warning.
        """
        if not hasattr(self, "_cached_flow"):
            # Primary: look up by flow_token on FlowSubmission
            sub = FlowSubmission.objects.select_related("flow").filter(flow_token=flow_token).first()
            if sub:
                self._cached_flow = sub.flow
            else:
                # Secondary fallback: token might be the meta_flow_id itself
                # (useful for manual tests or direct API calls).
                flow = WhatsappFlow.objects.filter(meta_flow_id=flow_token).first()
                if flow:
                    logger.info(
                        "[FlowDataExchange] Fallback: matched flow '%s' by meta_flow_id from token.",
                        flow.name,
                    )
                    self._cached_flow = flow
                else:
                    logger.warning(
                        "[FlowDataExchange] No FlowSubmission or WhatsappFlow found for token %s. "
                        "Dynamic options CANNOT be fetched. "
                        "If testing via QR preview, open the flow from an automation instead.",
                        flow_token[:8] if len(flow_token) >= 8 else flow_token,
                    )
                    self._cached_flow = None
        return self._cached_flow


    def _handle_complete(self, flow_token: str, screen_data: dict) -> dict:
        screen_data = self._enrich_with_labels(screen_data, flow_token)

        # Save submission 
        submission = FlowSubmission.objects.filter(flow_token=flow_token).first()
        if submission:
            submission.screen_data = screen_data
            submission.completed   = True
            submission.save(update_fields=["screen_data", "completed", "updated_at"])
        else:
            logger.warning("[FlowDataExchange] No pre-created submission for token %s", flow_token[:8])
            FlowSubmission.objects.create(
                flow=self._find_flow_by_token(flow_token),
                flow_token=flow_token,
                screen_data=screen_data,
                completed=True,
            )

        self._resume_automation(flow_token, screen_data)
        return {"screen": "SUCCESS", "data": {}}


    def _enrich_with_labels(self, screen_data: dict, flow_token: str) -> dict:
        """
        For every dynamic field in data_api_config, fetch the options and
        inject a `<field_id>_label` key with the human-readable title.

        Handles:
          - Single-select (dynamic_dropdown): submitted value is a string ID
          - Multi-select  (dynamic_checkbox): submitted value is a list of IDs
        """
        flow_obj   = self._find_flow_by_token_cached(flow_token)
        api_config = getattr(flow_obj, "data_api_config", {}) if flow_obj else {}

        if not api_config:
            return screen_data

        enriched = dict(screen_data) 

        for field_id, cfg in api_config.items():
            options = self._fetch_dynamic_options(cfg, submitted_data=screen_data, for_enrichment=True)
            if not options:
                continue

            lookup = {opt["id"]: opt["title"] for opt in options}
            lookup_uuid = {opt["id"]: opt.get("uuid") for opt in options}

            field_type = cfg.get("field_type", "dynamic_dropdown")

            matched_keys = []
            if field_id in screen_data:
                matched_keys.append(field_id)
            else:
                for k, v in screen_data.items():
                    if k.endswith("_label") or k.endswith("_labels") or k.endswith("_uuid"):
                        continue
                    if field_type == "dynamic_checkbox" and isinstance(v, list) and len(v) > 0:
                        if all(str(val) in lookup for val in v):
                            matched_keys.append(k)
                    elif str(v) in lookup:
                        matched_keys.append(k)

            for k in matched_keys:
                raw_value = screen_data.get(k)
                if field_type == "dynamic_checkbox" and isinstance(raw_value, list):
                    labels = [lookup.get(str(v), str(v)) for v in raw_value]
                    enriched[f"{k}_label"] = ", ".join(labels)  
                    enriched[f"{k}_labels"] = labels             
                    uuids = [lookup_uuid.get(str(v), str(v)) for v in raw_value]
                    enriched[f"{k}_uuid"] = uuids
                else:
                    enriched[f"{k}_label"] = lookup.get(str(raw_value), str(raw_value))
                    opt_uuid = lookup_uuid.get(str(raw_value))
                    enriched[f"{k}_uuid"] = opt_uuid if opt_uuid else str(raw_value)

                logger.info(
                    "[FlowDataExchange] Enriched field %s (mapped from %s): %s → label: %s, uuid: %s",
                    k, field_id, raw_value, enriched.get(f"{k}_label"), enriched.get(f"{k}_uuid"),
                )

        return enriched


    #  Automation resume 
    def _resume_automation(self, flow_token: str, screen_data: dict):
        """
        Find the WAITING FlowExecution that holds this flow_token and resume it.
        The execution was paused by _handle_whatsapp_flow_node() in engine.py.
        """
        try:
            from apps.automation.models import FlowExecution, ExecutionStatus
            from apps.automation.engine import AutomationEngine
            from apps.ai.chatbot.base import ChatbotContext

            execution = FlowExecution.objects.filter(
                variables__contains={"__wa_flow_token": flow_token},
                status=ExecutionStatus.WAITING,
            ).select_related("contact", "current_node", "flow").first()

            if not execution:
                logger.info("[FlowDataExchange] No waiting execution for token %s", flow_token[:8])
                return

            # Merge all submitted form data into execution variables
            execution.variables.update(screen_data)
            execution.variables.pop("__wa_flow_token", None)
            execution.variables.pop("__wa_flow_node_id", None)
            execution.save(update_fields=["variables"])

            # Get the linked conversation
            conv = execution.contact.conversations.filter(
                instance=execution.flow.instance
            ).first()

            if not conv:
                logger.warning("[FlowDataExchange] No conversation found for execution %s", execution.id)
                return

            logger.info(
                "[FlowDataExchange] Resuming execution %s for conv %s with data: %s",
                str(execution.id)[:8], conv.id, list(screen_data.keys()),
            )

            ctx = ChatbotContext(
                contact_name=conv.contact.name or "",
                inbound_message_body="",
            )
            engine = AutomationEngine(conv)
            reply = engine._resume_whatsapp_flow(execution.current_node, execution, ctx)
            if reply and not reply.is_empty:
                from apps.ai.chatbot.dispatcher import ChatbotDispatcher
                dispatcher = ChatbotDispatcher(conv)
                dispatcher._persist_and_broadcast(reply)

        except Exception as exc:
            logger.error("[FlowDataExchange] Failed to resume automation: %s", exc, exc_info=True)


    def _get_prefill_from_execution(self, flow_token: str) -> dict:
        """
        Prefill the first screen with any variables already collected
        """
        try:
            from apps.automation.models import FlowExecution, ExecutionStatus

            execution = FlowExecution.objects.filter(
                variables__contains={"__wa_flow_token": flow_token},
                status=ExecutionStatus.WAITING,
            ).first()

            if execution:
                return {
                    k: v for k, v in execution.variables.items()
                    if not k.startswith("__")
                }
        except Exception as exc:
            logger.warning("[FlowDataExchange] Prefill lookup failed: %s", exc)
        return {}

    def _find_flow_by_token(self, flow_token: str):
        """Fallback: find the WhatsappFlow from a FlowSubmission record."""
        sub = FlowSubmission.objects.filter(flow_token=flow_token).first()
        return sub.flow if sub else None
