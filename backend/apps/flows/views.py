import json
import logging
import secrets

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
        url = f"{settings.META_GRAPH_API_BASE_URL}/{flow.meta_flow_id}"
        headers = {
            "Authorization": f"Bearer {instance_obj.access_token}",
            "Content-Type": "application/json",
        }
        res = requests.post(url, json={"publish": True}, headers=headers)
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
        flow_json_bytes = json.dumps(flow.flow_json).encode("utf-8")

        url = f"{settings.META_GRAPH_API_BASE_URL}/{flow.meta_flow_id}/assets"
        headers = {"Authorization": f"Bearer {instance_obj.access_token}"}

        files = {
            "file": ("flow.json", flow_json_bytes, "application/json"),
            "name": (None, "flow.json"),
            "asset_type": (None, "FLOW_JSON"),
        }
        res = requests.post(url, headers=headers, files=files)

        if res.status_code == 200:
            return Response({"status": "uploaded"})
        logger.error("[FlowViewSet] Meta upload failed: %s", res.text)
        return Response({"error": "Meta API error", "detail": res.json()}, status=res.status_code)

    # ── Private helpers ────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# Flow Submissions
# ─────────────────────────────────────────────────────────────────────────────

class FlowSubmissionListView(APIView):
    """
    GET /api/flows/submissions/?flow=<uuid>
    List all submissions for a specific flow.
    """
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_AUTOMATIONS

    def get(self, request):
        qs = FlowSubmission.objects.select_related("flow", "conversation").all()

        # Filter by flow id
        flow_id = request.query_params.get("flow")
        if flow_id:
            qs = qs.filter(flow_id=flow_id)

        # Scope to tenant
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

        options = []
        for item in items:
            if not isinstance(item, dict):
                continue
            opt_id    = item.get(id_field, "")
            opt_label = item.get(label_field, str(opt_id))
            if opt_id:
                options.append({"id": str(opt_id), "title": str(opt_label)})

        return Response({"count": len(options), "options": options[:50]}) 



# ─────────────────────────────────────────────────────────────────────────────
# Data Exchange Endpoint — called by Meta for every screen interaction
# ─────────────────────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name="dispatch")
class FlowDataExchangeView(View):

    def post(self, request, *args, **kwargs):
        raw_body = request.body

        # ── Health-check: Meta may send an unencrypted ping ──
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return HttpResponse("Bad Request", status=400)

        # Unencrypted health ping
        if body.get("action") == "ping" and "encrypted_flow_data" not in body:
            return JsonResponse({"data": {"status": "active"}})

        # ── Encrypted payload ──
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

        # ── Ping (encrypted) ──
        if action_name == "ping":
            response_data = {"data": {"status": "active"}}
            encrypted = encrypt_flow_response(response_data, aes_key, iv)
            return HttpResponse(encrypted, content_type="text/plain")

        if action_name == "INIT":
            response_data = self._handle_init(flow_token, data)

        elif action_name == "data_exchange":
            response_data = self._handle_screen(screen, flow_token, data)

        else:
            logger.warning("[FlowDataExchange] Unknown action: %s", action_name)
            response_data = {"screen": "ERROR", "data": {}}

        encrypted = encrypt_flow_response(response_data, aes_key, iv)
        return HttpResponse(encrypted, content_type="text/plain")

    # ── Screen handlers ──────────────────────────────────────────────────────

    def _handle_init(self, flow_token: str, data: dict) -> dict:
        """
        Called when the Flow first opens.
        Pre-populate fields using execution variables if available.
        """
        prefill = self._get_prefill_from_execution(flow_token)
        return {
            "screen": "SEARCH",  # first screen name in your flow_json
            "data": prefill,
        }

    def _handle_screen(self, screen: str, flow_token: str, data: dict) -> dict:
        """
        Route each screen's submission to its handler.
        For screens with dynamic dropdowns, call the configured API.
        """
        submitted_screen = data.get("screen", screen)
        if submitted_screen == "COMPLETE" or screen == "COMPLETE":
            return self._handle_complete(flow_token, data)

        next_screen = data.get("next_screen", "SUCCESS")

        # ── Load the flow's API config ───────────────────────────────────────
        flow_obj = self._find_flow_by_token_cached(flow_token)
        api_config = getattr(flow_obj, "data_api_config", {}) if flow_obj else {}

        # ── Fetch dynamic options for every configured field on next screen ──
        extra_data = {}
        for field_name, cfg in api_config.items():
            # Only fetch for fields that target the next screen
            target_screen = cfg.get("screen", next_screen)
            if target_screen != next_screen:
                continue

            options = self._fetch_dynamic_options(cfg, submitted_data=data)
            extra_data[field_name] = options  # e.g. "product_field": [{"id":..,"title":..}]

        return {
            "screen": next_screen,
            "data": {
                **data,      
                **extra_data,
            },
        }

    # ── Dynamic API caller ───────────────────────────────────────────────────

    def _fetch_dynamic_options(self, cfg: dict, submitted_data: dict) -> list:
    
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
                options.append({"id": str(opt_id), "title": str(opt_label)})

        return options

    # ── Cached flow lookup ───────────────────────────────────────────────────

    def _find_flow_by_token_cached(self, flow_token: str):
        """Look up the WhatsappFlow from a FlowSubmission. Cached per request."""
        if not hasattr(self, "_cached_flow"):
            sub = FlowSubmission.objects.select_related("flow").filter(flow_token=flow_token).first()
            self._cached_flow = sub.flow if sub else None
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
            raw_value = screen_data.get(field_id)
            if raw_value is None:
                continue 

            # Fetch the options list from the API (same helper used by _handle_screen)
            options = self._fetch_dynamic_options(cfg, submitted_data=screen_data)
            lookup = {opt["id"]: opt["title"] for opt in options}

            field_type = cfg.get("field_type", "dynamic_dropdown")

            if field_type == "dynamic_checkbox" and isinstance(raw_value, list):
                labels = [lookup.get(str(v), str(v)) for v in raw_value]
                enriched[f"{field_id}_label"] = ", ".join(labels)  
                enriched[f"{field_id}_labels"] = labels             
            else:
                enriched[f"{field_id}_label"] = lookup.get(str(raw_value), str(raw_value))

            logger.info(
                "[FlowDataExchange] Enriched field %s: %s → %s",
                field_id, raw_value, enriched.get(f"{field_id}_label"),
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
            engine._resume_whatsapp_flow(execution.current_node, execution, ctx)

        except Exception as exc:
            logger.error("[FlowDataExchange] Failed to resume automation: %s", exc, exc_info=True)

    def _get_prefill_from_execution(self, flow_token: str) -> dict:
        """
        Prefill the first screen with any variables already collected
        by prior automation nodes (e.g. guest_count from collect_input).
        """
        try:
            from apps.automation.models import FlowExecution, ExecutionStatus

            execution = FlowExecution.objects.filter(
                variables__contains={"__wa_flow_token": flow_token},
                status=ExecutionStatus.WAITING,
            ).first()

            if execution:
                # Return all non-internal variables as prefill data
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
