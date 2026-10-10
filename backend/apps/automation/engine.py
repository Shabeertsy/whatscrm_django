import re
import logging
from typing import Optional
from apps.flows.utils import flatten_dict

from django.conf import settings
from django.db.models import Q

## Chatbot engine imports
from apps.ai.chatbot.base import (
    BaseChatbotEngine, 
    ChatbotContext, 
    ChatbotReply
    )

## Model imports
from apps.automation.models import (
    AutomationFlow, FlowExecution, FlowStepLog, FlowStatus,
    NodeType, StepStatus, ExecutionStatus, TriggerType,
)
from apps.messaging.models import Conversation
from apps.messaging.utils import broadcast_conversation_update


logger = logging.getLogger(__name__)


# Sentinel values returned by node handlers 
_STOP    = "STOP"    
_WAITING = "WAITING"  
_DELAYED = "DELAYED"  


class AutomationEngine(BaseChatbotEngine):

    def __init__(self, conversation: Conversation):
        self.conv = conversation

    def generate_reply(self, ctx: ChatbotContext) -> Optional[ChatbotReply]:
        """
        1. If a WAITING execution exists, resume it (e.g. menu response).
        2. Otherwise, find a matching trigger and start a fresh execution.
        """
        inbound_text = self._normalize_text(ctx.inbound_message_body or "")

        # Resume an existing WAITING execution
        waiting = FlowExecution.objects.filter(
            contact=self.conv.contact,
            status=ExecutionStatus.WAITING,
        ).first()
        if waiting:
            return self._resume_execution(waiting, ctx, inbound_text)

        # Find the first matching trigger
        triggered_flow, trigger_node = self._find_trigger(inbound_text)
        if not triggered_flow or not trigger_node:
            return None

        logger.info(
            "[AutomationEngine] Flow '%s' triggered for Conv %s",
            triggered_flow.name, self.conv.id,
        )

        execution = FlowExecution.objects.create(
            flow=triggered_flow,
            contact=self.conv.contact,
            status=ExecutionStatus.RUNNING,
            current_node=trigger_node,
        )
        self._log_step(execution, trigger_node, StepStatus.COMPLETED)

        reply = ChatbotReply()
        self._traverse_flow(execution, trigger_node, ctx, reply)
        return reply if not reply.is_empty else None

    def resume_wait_execution(
        self,
        execution: FlowExecution,
        ctx: ChatbotContext,
    ) -> Optional[ChatbotReply]:
        """
        Called by the Celery task after a wait-node countdown expires.
        Advances past the wait node and continues traversal.
        """
        if execution.status in (ExecutionStatus.CANCELLED, ExecutionStatus.COMPLETED):
            return None

        current_node = execution.current_node
        if not current_node or current_node.node_type not in (NodeType.WAIT, "wait"):
            return None

        execution.status = ExecutionStatus.RUNNING
        execution.save(update_fields=["status"])

        next_node = self._advance_to_next(execution, current_node)
        if next_node is None:
            execution.complete()
            return None

        reply = ChatbotReply()
        self._traverse_flow(execution, current_node, ctx, reply, start_at=next_node)
        return reply if not reply.is_empty else None



    #  Core traversal loop   
    def _traverse_flow(
        self,
        execution: FlowExecution,
        start_node,
        ctx: ChatbotContext,
        reply: ChatbotReply,
        start_at=None,
    ):
        """
        Walk the flow graph from start_node (or start_at if given).
        Each iteration dispatches to a per-node handler.
        The handler returns the next FlowNode, or a sentinel (_STOP / _WAITING / _DELAYED).
        """
        if start_at is None:
            current_node = self._advance_to_next(execution, start_node)
            if current_node is None:
                execution.complete()
                return
        else:
            current_node = start_at

        while current_node:
            node_type = current_node.node_type

            if node_type in (NodeType.ACTION, "action"):
                result = self._handle_action_node(current_node, execution, ctx, reply)

            elif node_type in (NodeType.MENU, "menu"):
                result = self._handle_menu_node(current_node, execution, reply)

            elif node_type in (NodeType.CONDITION, "condition"):
                result = self._handle_condition_node(current_node, execution, ctx)

            elif node_type in (NodeType.WAIT, "wait"):
                result = self._handle_wait_node(current_node, execution)

            elif node_type in (NodeType.END_CHAT, "end_chat"):
                result = self._handle_end_chat_node(current_node, execution, reply)

            elif node_type in (NodeType.COLLECT_INPUT, "collect_input"):
                result = self._handle_collect_input_node(current_node, execution, reply)

            elif node_type in (NodeType.SAVE_CONTACT, "save_contact"):
                result = self._handle_save_contact_node(current_node, execution)

            elif node_type in (NodeType.SAVE_LOCATION, "save_location"):
                result = self._handle_save_location_node(current_node, execution)

            elif node_type in (NodeType.AI_CONTROL, "ai_control"):
                result = self._handle_ai_control_node(current_node, execution, ctx, reply)

            elif node_type in (NodeType.HTTP_REQUEST, "http_request"):
                result = self._handle_http_request_node(current_node, execution)

            elif node_type in (NodeType.WHATSAPP_FLOW, "whatsapp_flow"):
                result = self._handle_whatsapp_flow_node(current_node, execution)

            elif node_type in (NodeType.SEND_LISTING, "send_listing"):
                result = self._handle_send_listing_node(current_node, execution, reply)

            else:
                logger.warning(
                    "[AutomationEngine] Unhandled node type '%s' — stopping traversal.", node_type
                )
                result = _STOP

            # Sentinels end the loop; a FlowNode continues it
            if result in (_STOP, _WAITING, _DELAYED) or result is None:
                execution.current_node = current_node
                execution.save(update_fields=["current_node"])
                break

            current_node = result
            execution.current_node = current_node
            execution.save(update_fields=["current_node"])


    #  Per-node handlers  
    def _handle_action_node(self, node, execution, ctx, reply):
        """Send a text or media message. Returns the next node."""
        message_text = node.config.get("message", "")
        message_text = message_text.replace("{{contact_name}}", ctx.contact_name)

        media_url  = node.config.get("mediaUrl", "")
        media_type = node.config.get("mediaType", "")
        storage_path = node.config.get("storagePath", "")

        if media_url and media_type:
            msg_type = media_type.split("/")[0] if "/" in media_type else "image"
            if msg_type not in ("image", "video", "audio", "document"):
                msg_type = "document"
            reply.add_media(msg_type=msg_type, media_url=media_url, caption=message_text, storage_path=storage_path)
        else:
            reply.add_text(message_text)

        self._log_step(execution, node, StepStatus.COMPLETED)

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
            return _STOP
        return next_node

    def _handle_menu_node(self, node, execution, reply):
        """
          1-3 options  → Reply Buttons
          4-10 options → List Message
          >10 options  → Paginated List Messages (multiple messages, 10 per page)
        """
        message_text = node.config.get("message", "Please choose an option:")
        options      = node.config.get("options", [])
        header_text  = node.config.get("header", "")
        footer_text  = node.config.get("footer", "")
        button_label = node.config.get("buttonLabel", "View Options")

        sent_interactive = False

        if options and self.conv.instance and self.conv.instance.is_active:
            try:
                n = len(options)

                if n <= 3:
                    # ── Reply Buttons ──────────────────────────────────────────
                    from apps.messaging.utils import send_and_save_interactive_buttons
                    send_and_save_interactive_buttons(
                        self.conv,
                        body_text=message_text,
                        options=options,
                        header_text=header_text,
                        footer_text=footer_text,
                    )
                    sent_interactive = True

                elif n <= 10:
                    # ── Single List Message ────────────────────────────────────
                    from apps.messaging.utils import send_and_save_interactive_list
                    send_and_save_interactive_list(
                        self.conv,
                        body_text=message_text,
                        button_label=button_label,
                        options=options,
                        header_text=header_text,
                        footer_text=footer_text,
                    )
                    sent_interactive = True

                else:
                    # ── Paginated Lists (10 per page) ──────────────────────────
                    from apps.messaging.utils import send_and_save_interactive_list
                    page_size = 10
                    chunks = [options[i:i + page_size] for i in range(0, n, page_size)]
                    for page_idx, chunk in enumerate(chunks):
                        is_first = page_idx == 0
                        page_body = message_text if is_first else f"Continued... (part {page_idx + 1}/{len(chunks)})"
                        send_and_save_interactive_list(
                            self.conv,
                            body_text=page_body,
                            button_label=button_label or "View Options",
                            options=chunk,
                            header_text=header_text if is_first else "",
                            footer_text=footer_text if page_idx == len(chunks) - 1 else "",
                        )
                    sent_interactive = True

            except Exception as exc:
                logger.warning(
                    "[AutomationEngine] Interactive message failed (%s), falling back to plain text.", exc
                )

        if not sent_interactive:
            # plain numbered text
            lines = [message_text]
            for idx, opt in enumerate(options):
                lines.append(f"{idx + 1}. {opt.get('label', f'Option {idx + 1}')}")
            reply.add_text("\n".join(lines))

        execution.status = ExecutionStatus.WAITING
        execution.save(update_fields=["status"])
        self._log_step(execution, node, StepStatus.PENDING)
        return _WAITING


    def _handle_condition_node(self, node, execution, ctx):
        """Evaluate conditions sequentially and follow the matched edge."""
        conditions = node.config.get("conditions", [])
        
        matched_index = None
        for idx, cond in enumerate(conditions):
            if self._evaluate_condition(cond, ctx):
                matched_index = idx
                break

        logger.debug(
            "[AutomationEngine] Condition node %s → matched rule %s", node.node_id, matched_index
        )
        self._log_step(execution, node, StepStatus.COMPLETED)

        handle_id = f"cond_{matched_index}" if matched_index is not None else "fallback"
        
        edge = node.outgoing_edges.filter(source_handle=handle_id).first()
        
        # Legacy support for older graphs
        if not edge and matched_index is None:
            edge = node.outgoing_edges.filter(source_handle="false").first()
            
        if not edge and matched_index is not None:
            edge = node.outgoing_edges.filter(source_handle="true").first()

        if not edge:
            execution.complete()
            return _STOP

        return edge.target_node

    def _handle_wait_node(self, node, execution):
        """Pause the flow for a configured duration using a Celery countdown task."""
        delay_seconds = self._compute_delay_seconds(node.config)

        self._log_step(execution, node, StepStatus.COMPLETED)
        execution.status = ExecutionStatus.WAITING
        execution.save(update_fields=["status"])

        if getattr(settings, "CELERY_ENABLED", True):
            from apps.automation.tasks import resume_flow_execution
            resume_flow_execution.apply_async(
                args=[execution.id, self.conv.id],
                countdown=delay_seconds,
            )
            logger.info(
                "[AutomationEngine] Conv %s waiting for %s seconds.",
                self.conv.id, delay_seconds,
            )
        else:
            logger.warning(
                "[AutomationEngine] CELERY_ENABLED is False — wait node skipped."
            )
        return _DELAYED

    def _handle_end_chat_node(self, node, execution, reply):
        """ mark conversation as resolved, complete execution."""

        closing_msg = node.config.get("closingMessage", "")
        if closing_msg:
            reply.add_text(closing_msg)

        self._log_step(execution, node, StepStatus.COMPLETED)
        execution.complete()

        # Mark the conversation as resolved
        self.conv.status = "resolved"
        self.conv.save(update_fields=["status"])
        broadcast_conversation_update(self.conv)

        logger.info(
            "[AutomationEngine] Conv %s resolved by end_chat node.", self.conv.id
        )
        return _STOP

    def _handle_save_contact_node(self, node, execution):
        """
        Update fields on the WhatsApp Contact (and its linked CRM Contact if any),
        and/or add a tag. The fieldValue supports {{variable}} interpolation from
        execution.variables so collected inputs can be saved directly.
        """
        field_to_update = node.config.get("fieldToUpdate", "")
        field_value     = node.config.get("fieldValue", "")
        tag_to_add      = node.config.get("tagToAdd", "")

        contact = self.conv.contact
        update_fields = []

        # Resolve {{variable}} placeholders from execution.variables
        resolved_value = self._interpolate_text(field_value, execution.variables).strip()
        resolved_tag = self._interpolate_text(tag_to_add, execution.variables).strip()

        #  Update a contact field 
        CONTACT_FIELD_MAP = {
            "name":  "name",
            "notes": "notes",
            "email": "notes",   
        }
        CRM_FIELD_MAP = {
            "name":  "name",
            "email": "email",
            "notes": "notes",
        }

        if field_to_update and resolved_value:
            if field_to_update == "name":
                contact.name = resolved_value
                update_fields.append("name")

            elif field_to_update == "notes":
                contact.notes = resolved_value
                update_fields.append("notes")

            # Update linked CRM Contact if it exists
            crm = getattr(contact, "crm_contact", None)
            if crm and field_to_update in CRM_FIELD_MAP:
                crm_field = CRM_FIELD_MAP[field_to_update]
                setattr(crm, crm_field, resolved_value)
                crm.save(update_fields=[crm_field, "updated_at"])
                logger.info(
                    "[AutomationEngine] Conv %s CRM contact.%s set to '%s'.",
                    self.conv.id, crm_field, resolved_value,
                )

        # Add a tag to the WhatsApp Contact
        if resolved_tag:
            tags = contact.tags if isinstance(contact.tags, list) else []
            if resolved_tag not in tags:
                tags.append(resolved_tag)
                contact.tags = tags
                update_fields.append("tags")

        # Save all contact changes in one call
        if update_fields:
            if "updated_at" not in update_fields:
                update_fields.append("updated_at")
            contact.save(update_fields=update_fields)
            logger.info(
                "[AutomationEngine] Conv %s contact updated: %s.",
                self.conv.id, update_fields,
            )

        self._log_step(execution, node, StepStatus.COMPLETED)

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
            return _STOP
        return next_node


    def _handle_save_location_node(self, node, execution):
        """
        Assign the location to the WhatsApp contact and linked CRM contact.
        """
        location_id = node.config.get("locationId")

        if location_id:
            contact = self.conv.contact
            
            # Save location to WhatsApp contact
            contact.location_id = location_id
            contact.save(update_fields=["location", "updated_at"])

            # Save location to CRM contact
            crm = getattr(contact, "crm_contact", None)
            if crm:
                crm.location_id = location_id
                crm.save(update_fields=["location", "updated_at"])
                logger.info(
                    "[AutomationEngine] Conv %s WhatsApp and CRM contact location set to '%s'.",
                    self.conv.id, location_id,
                )
            else:
                logger.info(
                    "[AutomationEngine] Conv %s WhatsApp contact location set to '%s' (no CRM contact).",
                    self.conv.id, location_id,
                )

        self._log_step(execution, node, StepStatus.COMPLETED)

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
            return _STOP
        return next_node


    def _handle_http_request_node(self, node, execution):
        """
        Execute an HTTP request and optionally save the response to a variable.
        """
        import requests

        http_method      = node.config.get("httpMethod", "GET").upper()
        url              = self._interpolate_text(node.config.get("url", ""), execution.variables)
        headers          = node.config.get("headers", {}) or {}
        query_params_cfg = node.config.get("queryParams", {}) or {}
        req_body         = node.config.get("requestBody")
        resp_var         = node.config.get("responseVariable", "")
        resp_extract     = node.config.get("responseExtract", {}) or {}

        if not url:
            logger.warning("[AutomationEngine] Conv %s HTTP Request node missing URL.", self.conv.id)
        else:
            # Interpolate headers
            interpolated_headers = {
                k: self._interpolate_text(str(v), execution.variables)
                for k, v in headers.items()
            }

            # Interpolate queryParams dict and build params dict
            params = {
                k: self._interpolate_text(str(v), execution.variables)
                for k, v in query_params_cfg.items()
                if self._interpolate_text(str(v), execution.variables)  # skip empty values
            }

            # Interpolate request body
            if isinstance(req_body, str):
                req_body = self._interpolate_text(req_body, execution.variables)
            elif isinstance(req_body, dict):
                req_body = {
                    k: self._interpolate_text(str(v), execution.variables)
                    if isinstance(v, str) else v
                    for k, v in req_body.items()
                }

            try:
                logger.info(
                    "[AutomationEngine] Conv %s HTTP %s %s params=%s",
                    self.conv.id, http_method, url, list(params.keys()),
                )
                if http_method == "GET":
                    response = requests.get(url, headers=interpolated_headers, params=params, timeout=10)
                elif http_method == "POST":
                    if isinstance(req_body, dict):
                        response = requests.post(url, headers=interpolated_headers, params=params, json=req_body, timeout=10)
                    else:
                        response = requests.post(url, headers=interpolated_headers, params=params, data=req_body, timeout=10)
                elif http_method == "PUT":
                    if isinstance(req_body, dict):
                        response = requests.put(url, headers=interpolated_headers, params=params, json=req_body, timeout=10)
                    else:
                        response = requests.put(url, headers=interpolated_headers, params=params, data=req_body, timeout=10)
                else:
                    response = requests.request(
                        http_method, url,
                        headers=interpolated_headers, params=params, data=req_body, timeout=10,
                    )

                try:
                    resp_data = response.json()
                except ValueError:
                    resp_data = response.text

                vars_changed = False

                # Store full response under responseVariable
                if resp_var:
                    execution.variables[resp_var] = resp_data
                    vars_changed = True
                    logger.info(
                        "[AutomationEngine] Conv %s HTTP response stored in '{{%s}}'",
                        self.conv.id, resp_var,
                    )

                # Extract individual fields using dot-path notation
                if resp_extract and isinstance(resp_data, (dict, list)):
                    # Build a temporary lookup that includes the full response
                    # at the responseVariable key so paths like "results.0.name" work
                    lookup_root = (
                        {resp_var: resp_data, **resp_data}
                        if isinstance(resp_data, dict)
                        else {resp_var: resp_data}
                    )
                    for target_var, dot_path in resp_extract.items():
                        resolved = self._resolve_variable(lookup_root, dot_path)
                        if resolved is not None and resolved != dot_path:
                            execution.variables[target_var] = resolved
                            vars_changed = True
                            logger.info(
                                "[AutomationEngine] Conv %s extracted '%s' = %s (from path '%s')",
                                self.conv.id, target_var,
                                str(resolved)[:80], dot_path,
                            )
                        else:
                            logger.warning(
                                "[AutomationEngine] Conv %s responseExtract: path '%s' not found in response.",
                                self.conv.id, dot_path,
                            )

                if vars_changed:
                    execution.save(update_fields=["variables"])

            except Exception as exc:
                logger.error("[AutomationEngine] Conv %s HTTP Request failed: %s", self.conv.id, exc)

        self._log_step(execution, node, StepStatus.COMPLETED)

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
            return _STOP
        return next_node


    def _handle_ai_control_node(self, node, execution, ctx, reply):
        """
        Enable or disable AI for the conversation.
        If enabling, immediately fetch an AI response and append it to the current flow's reply batch.
        """
        ai_action = node.config.get("aiAction", "")

        if ai_action == "enable_ai":
            if not self.conv.ai_active:
                self.conv.ai_active = True
                self.conv.save(update_fields=["ai_active"])
                logger.info("[AutomationEngine] Conv %s AI enabled by ai_control node.", self.conv.id)
            
            # Immediately let the AI answer the current context
            from apps.ai.chatbot.dispatcher import ChatbotDispatcher
            dispatcher = ChatbotDispatcher(self.conv)
            ai_engine = dispatcher._resolve_ai_engine()
            
            if ai_engine:
                logger.info("[AutomationEngine] Conv %s generating immediate AI reply.", self.conv.id)
                ai_reply = ai_engine.generate_reply(ctx)
                if ai_reply and not ai_reply.is_empty:
                    reply.messages.extend(ai_reply.messages)

        elif ai_action == "disable_ai":
            if self.conv.ai_active:
                self.conv.ai_active = False
                self.conv.save(update_fields=["ai_active"])
                logger.info("[AutomationEngine] Conv %s AI disabled by ai_control node.", self.conv.id)

        self._log_step(execution, node, StepStatus.COMPLETED)
        
        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
            return _STOP
        return next_node


    def _handle_collect_input_node(self, node, execution, reply):
        """Send the prompt and pause execution waiting for the user's answer."""
        prompt = node.config.get("prompt", "")
        if prompt:
            reply.add_text(prompt)

        execution.status = ExecutionStatus.WAITING
        execution.save(update_fields=["status"])
        self._log_step(execution, node, StepStatus.PENDING)
        return _WAITING


    def _handle_whatsapp_flow_node(self, node, execution):
        """
        Send a WhatsApp Flow CTA button to the contact, then pause execution.
        Stores the flow_token in execution.variables so FlowDataExchangeView
        can find and resume this exact execution when the form is submitted.
        """
        import secrets

        flow_id   = node.config.get("flowId", "")
        cta_label = node.config.get("ctaLabel", "Open Form")
        header    = node.config.get("headerText", "")
        body_text = node.config.get("bodyText", "Please fill out the form below.")

        if not flow_id:
            logger.warning("[AutomationEngine] Conv %s whatsapp_flow node missing flowId.", self.conv.id)
            self._log_step(execution, node, StepStatus.FAILED)
            next_node = self._advance_to_next(execution, node)
            if next_node is None:
                execution.complete()
                return _STOP
            return next_node

        try:
            from apps.flows.models import WhatsappFlow
            flow_obj = WhatsappFlow.objects.get(id=flow_id)
        except WhatsappFlow.DoesNotExist:
            logger.warning("[AutomationEngine] Conv %s WhatsApp Flow %s not found.", self.conv.id, flow_id)
            self._log_step(execution, node, StepStatus.FAILED)
            next_node = self._advance_to_next(execution, node)
            if next_node is None:
                execution.complete()
                return _STOP
            return next_node

        if not flow_obj.meta_flow_id:
            logger.warning(
                "[AutomationEngine] Conv %s Flow '%s' has no meta_flow_id (not yet published).",
                self.conv.id, flow_obj.name,
            )
            self._log_step(execution, node, StepStatus.FAILED)
            next_node = self._advance_to_next(execution, node)
            if next_node is None:
                execution.complete()
                return _STOP
            return next_node

        # Generate a unique token for this session
        flow_token = secrets.token_hex(16)

        # Persist token so FlowDataExchangeView can look up this execution
        execution.variables["__wa_flow_token"]   = flow_token
        execution.variables["__wa_flow_node_id"] = node.node_id
        execution.save(update_fields=["variables"])

        # Interpolate body text with existing variables
        body_text = self._interpolate_text(body_text, execution.variables)
        header    = self._interpolate_text(header, execution.variables)

        # Send the interactive Flow CTA button
        if self.conv.instance and self.conv.instance.is_active:
            try:
                import json
                fj = flow_obj.flow_json
                if isinstance(fj, str):
                    try:
                        fj = json.loads(fj)
                    except:
                        fj = {}
                fj = fj or {}
                
                first_screen_id = "SEARCH"
                screens = fj.get("screens", [])
                routing = fj.get("routing_model") or fj.get("routing", {})
                
                if routing and isinstance(routing, dict):
                    all_targets = set()
                    for targets in routing.values():
                        if isinstance(targets, list):
                            all_targets.update(targets)
                    
                    starts = [k for k in routing.keys() if k not in all_targets]
                    if starts:
                        first_screen_id = starts[0]
                    else:
                        first_screen_id = list(routing.keys())[0]
                elif screens and isinstance(screens, list) and len(screens) > 0:
                    first_screen_id = screens[0].get("id", "SEARCH")

                from apps.messaging.utils import send_whatsapp_flow_message
                
                action_type = "data_exchange" if flow_obj.data_api_config else "navigate"

                try:
                    res = send_whatsapp_flow_message(
                        instance     = self.conv.instance,
                        to_phone     = self.conv.contact.wa_id,
                        flow_id      = str(flow_obj.meta_flow_id),
                        flow_token   = flow_token,
                        header_text  = header,
                        body_text    = body_text,
                        button_label = cta_label,
                        first_screen = first_screen_id,
                        flow_action  = action_type,
                    )
                except Exception as exc:
                    err_str = str(exc)
                    import re
                    match = re.search(r"Allowed screen name is:\s*([A-Za-z0-9_]+)", err_str)
                    if match:
                        correct_screen = match.group(1).strip()
                        logger.info("[AutomationEngine] Retrying WhatsApp Flow with allowed screen: %s", correct_screen)
                        res = send_whatsapp_flow_message(
                            instance     = self.conv.instance,
                            to_phone     = self.conv.contact.wa_id,
                            flow_id      = str(flow_obj.meta_flow_id),
                            flow_token   = flow_token,
                            header_text  = header,
                            body_text    = body_text,
                            button_label = cta_label,
                            first_screen = correct_screen,
                            flow_action  = action_type,
                        )
                    else:
                        raise exc
                
                wa_msg_id = ""
                try:
                    res_json = res.json()
                    wa_msg_id = res_json.get("messages", [{}])[0].get("id", "")
                except Exception:
                    pass

                # Save message to DB so it appears in Inbox
                from apps.messaging.models import Message
                from django.utils import timezone
                msg_obj = Message.objects.create(
                    conversation=self.conv,
                    wa_message_id=wa_msg_id,
                    direction='outbound',
                    msg_type='interactive',
                    body=body_text or 'Please fill out the form below.',
                    status='sent',
                    timestamp=timezone.now(),
                    sent_by=None
                )
                from apps.messaging.utils import broadcast_message_update
                broadcast_message_update(self.conv, msg_obj)

                logger.info(
                    "[AutomationEngine] Conv %s sent WhatsApp Flow '%s' (token %s).",
                    self.conv.id, flow_obj.name, flow_token[:8],
                )

                # Pre-create a FlowSubmission record for tracking
                from apps.flows.models import FlowSubmission
                FlowSubmission.objects.create(
                    flow          = flow_obj,
                    conversation  = self.conv,
                    contact_wa_id = self.conv.contact.wa_id,
                    flow_token    = flow_token,
                    completed     = False,
                )

            except Exception as exc:
                logger.error(
                    "[AutomationEngine] Conv %s failed to send WhatsApp Flow: %s", self.conv.id, exc
                )
                self._log_step(execution, node, StepStatus.FAILED)
                next_node = self._advance_to_next(execution, node)
                if next_node is None:
                    execution.complete()
                    return _STOP
                return next_node

        execution.status = ExecutionStatus.WAITING
        execution.save(update_fields=["status"])
        self._log_step(execution, node, StepStatus.PENDING)
        return _WAITING


    def _resume_whatsapp_flow(self, node, execution, ctx, reply=None):
        """
        Called by FlowDataExchangeView after the customer completes the form.
        All submitted field values are already merged into execution.variables
        before this is called.
        Continues traversal from the next node.
        """
        if reply is None:
            reply = ChatbotReply()

        self._log_step(execution, node, StepStatus.COMPLETED)
        execution.status = ExecutionStatus.RUNNING
        execution.save(update_fields=["status"])

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
        else:
            self._traverse_flow(execution, node, ctx, reply, start_at=next_node)

        return reply if not reply.is_empty else None


    def _resume_collect_input(self, node, execution, ctx, reply, inbound_text):
        """Validate the user's reply, store it in execution.variables, and continue."""
        validation_type = node.config.get("validationType", "any")
        variable_name   = node.config.get("variableName", "")
        error_msg       = node.config.get("errorMessage", "Invalid input. Please try again.")
        max_retries     = int(node.config.get("maxRetries", 3))

        original_input = (ctx.inbound_message_body or "").strip()
        is_valid, normalised = self._validate_input(original_input, validation_type)

        retry_key = f"__retries_{node.node_id}"

        if not is_valid:
            # If the user gives a large input instead of the expected format, 
            # assume it's a description meant for the AI. If next node is AI, advance to it.
            if len(original_input) > 60 or len(original_input.split()) > 10:
                ai_control_edge = node.outgoing_edges.filter(target_node__node_type__in=["ai_control", NodeType.AI_CONTROL]).first()
                if ai_control_edge:
                    logger.info(
                        "[AutomationEngine] Conv %s provided long input during collect_input. Advancing to AI Control node.", 
                        self.conv.id
                    )
                    self._log_step(execution, node, StepStatus.COMPLETED)
                    execution.status = ExecutionStatus.RUNNING
                    execution.current_node = ai_control_edge.target_node
                    execution.save(update_fields=["status", "current_node"])
                    self._traverse_flow(execution, node, ctx, reply, start_at=ai_control_edge.target_node)
                    return reply if not reply.is_empty else None

            retry_count = execution.variables.get(retry_key, 0) + 1
            execution.variables[retry_key] = retry_count
            execution.save(update_fields=["variables"])

            if retry_count >= max_retries:
                # Max retries hit — log, clean up, and continue the flow anyway
                logger.info(
                    "[AutomationEngine] Conv %s collect_input max retries reached, advancing.",
                    self.conv.id,
                )
                execution.variables.pop(retry_key, None)
                execution.status = ExecutionStatus.RUNNING
                execution.save(update_fields=["status", "variables"])
                self._log_step(execution, node, StepStatus.COMPLETED)
                next_node = self._advance_to_next(execution, node)
                if next_node is None:
                    execution.complete()
                else:
                    self._traverse_flow(execution, node, ctx, reply, start_at=next_node)
            else:
                # Ask again — remain WAITING
                reply.add_text(error_msg)
                logger.info(
                    "[AutomationEngine] Conv %s collect_input invalid (retry %s/%s).",
                    self.conv.id, retry_count, max_retries,
                )

            return reply if not reply.is_empty else None

        # Valid — store value, clean up retry counter, continue
        if variable_name:
            execution.variables[variable_name] = normalised
            execution.variables.pop(retry_key, None)
            execution.save(update_fields=["variables"])
            logger.info(
                "[AutomationEngine] Conv %s stored '%s' = '%s'.",
                self.conv.id, variable_name, normalised,
            )

        self._log_step(execution, node, StepStatus.COMPLETED)
        execution.status = ExecutionStatus.RUNNING
        execution.save(update_fields=["status"])

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
        else:
            self._traverse_flow(execution, node, ctx, reply, start_at=next_node)

        return reply if not reply.is_empty else None



    # SEND_LISTING
    def _handle_send_listing_node(self, node, execution, reply):
        """
        Calls your property API with the user's submitted filters, sends the first
        result as a formatted card with Next / Book Now / Exit buttons, then pauses.
        """
        import requests as _requests

        cfg     = self._listing_cfg(node)
        api_url = self._interpolate_text(cfg["api_url"], execution.variables)

        if not api_url:
            logger.warning("[SendListing] Conv %s — apiUrl missing.", self.conv.id)
            self._log_step(execution, node, StepStatus.FAILED)
            execution.complete()
            return _STOP

        params  = self._interpolate_dict(cfg["query_params"], execution.variables)
        headers = self._interpolate_dict(cfg["headers"],      execution.variables)

        try:
            logger.info("[SendListing] Conv %s GET %s params_raw=%s params_interpolated=%s", 
                        self.conv.id, api_url, cfg["query_params"], params)
            resp  = _requests.get(api_url, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            items = self._extract_list(resp.json(), cfg["results_key"], cfg["max_results"])
        except Exception as exc:
            logger.error("[SendListing] Conv %s API error: %s", self.conv.id, exc)
            self._log_step(execution, node, StepStatus.FAILED)
            
            edge = node.outgoing_edges.filter(source_handle="no_results").first()
            if edge:
                execution.status = ExecutionStatus.RUNNING
                next_node = edge.target_node
                execution.current_node = next_node
                execution.save(update_fields=["status", "current_node"])
                return next_node
                
            reply.add_text(cfg["no_results_msg"])
            execution.complete()
            return _STOP

        if not items:
            logger.info("[SendListing] Conv %s — no results.", self.conv.id)
            self._log_step(execution, node, StepStatus.COMPLETED)
            
            edge = node.outgoing_edges.filter(source_handle="no_results").first()
            if edge:
                execution.status = ExecutionStatus.RUNNING
                next_node = edge.target_node
                execution.current_node = next_node
                execution.save(update_fields=["status", "current_node"])
                return next_node
                
            reply.add_text(cfg["no_results_msg"])
            execution.complete()
            return _STOP

        # Persist listing state so pagination survives across WAITING cycles
        execution.variables.update({
            "__listing_results": items,
            "__listing_index":   0,
            "__listing_total":   len(items),
        })
        execution.save(update_fields=["variables"])
        self._send_listing_card(execution, reply, items, start_index=0, cfg=cfg)

        self._log_step(execution, node, StepStatus.PENDING)
        execution.status = ExecutionStatus.WAITING
        execution.save(update_fields=["status"])
        return _WAITING


    def _resume_send_listing(self, node, execution, ctx, reply, inbound_text):
        """Called when the user replies while paused on a SEND_LISTING node."""
        chosen = self._resolve_interactive_id(inbound_text, execution)
        logger.info("[SendListing] Conv %s — chose '%s'.", self.conv.id, chosen)

        items = execution.variables.get("__listing_results", [])
        index = int(execution.variables.get("__listing_index", 0))
        total = len(items)
        cfg   = self._listing_cfg(node)
        page_size = min(20, max(1, int(cfg.get("max_results", 1))))

        if chosen == "listing_next":
            next_index = index + page_size
            if next_index >= total:
                reply.add_text(cfg["no_more_msg"])
                self._log_step(execution, node, StepStatus.COMPLETED)
                return self._listing_advance(execution, node, reply)

            execution.variables["__listing_index"] = next_index
            execution.save(update_fields=["variables"])
            self._send_listing_card(execution, reply, items, next_index, cfg)
            logger.info("[SendListing] Conv %s — card next %d.", self.conv.id, next_index)

        elif chosen.startswith("listing_book_"):
            try:
                book_index = int(chosen.split("_")[-1])
            except ValueError:
                book_index = index
                
            # Expose selected item as {{selected_<field>}} for downstream nodes
            if 0 <= book_index < total:
                for k, v in items[book_index].items():
                    execution.variables[f"selected_{k}"] = v
            self._listing_clear_state(execution)
            self._log_step(execution, node, StepStatus.COMPLETED)
            logger.info("[SendListing] Conv %s — booked item %d.", self.conv.id, book_index)
            return self._listing_advance(execution, node, reply, action="book")

        elif chosen == "listing_exit":
            self._listing_clear_state(execution)
            self._log_step(execution, node, StepStatus.COMPLETED)
            logger.info("[SendListing] Conv %s — exited.", self.conv.id)
            return self._listing_advance(execution, node, reply, action="exit")

        else:
            # Unknown reply — resend current card so buttons stay visible
            logger.info("[SendListing] Conv %s — unknown reply, resending card.", self.conv.id)
            if 0 <= index < total:
                self._send_listing_card(execution, reply, items, index, cfg)

        return reply if not reply.is_empty else None



    # ── SEND_LISTING helpers ──────────────────────────────────────────────────

    def _listing_cfg(self, node: "FlowNode") -> dict:
        """Return all node config values normalised into one dict."""
        c = node.config
        return {
            "api_url":        c.get("apiUrl", ""),
            "query_params":   c.get("queryParams",  {}) or {},
            "headers":        c.get("headers",       {}) or {},
            "results_key":    c.get("resultsKey",    ""),
            "max_results":    int(c.get("maxResults", 10)),
            "card_template":  c.get("cardTemplate",  ""),
            "card_image_template": c.get("cardImageTemplate", ""),
            "card_image_templates": c.get("cardImageTemplates", []),
            "card_image_limits": c.get("cardImageLimits", []),
            "enableImages":   c.get("enableImages", True),
            "imageLimit":     c.get("imageLimit", 4),
            "card_video_template": c.get("cardVideoTemplate", ""),
            "card_video_templates": c.get("cardVideoTemplates", []),
            "card_video_limits": c.get("cardVideoLimits", []),
            "enableVideos":   c.get("enableVideos", False),
            "videoLimit":     c.get("videoLimit", 1),
            "enable_next":    c.get("enableNext",    True),
            "next_label":     c.get("nextLabel",     " Next"),
            "enable_book":    c.get("enableBook",    True),
            "book_label":     c.get("bookLabel",     " Book Now"),
            "enable_exit":    c.get("enableExit",    True),
            "exit_label":     c.get("exitLabel",     " Exit"),
            "no_results_msg": c.get("noResultsMessage", "Sorry, no properties found matching your criteria."),
            "no_more_msg":    c.get("noMoreMessage",    "You've seen all available properties."),
        }

    def _interpolate_dict(self, d: dict, variables: dict) -> dict:
        """Interpolate {{variables}} in each dict value; drop keys that resolve to empty."""
        return {
            k: val
            for k, v in d.items()
            if (val := self._interpolate_text(str(v), variables).strip())
        }

    @staticmethod
    def _parse_image_urls(raw_url_str: str) -> list:
        """Parse a comma-separated string or JSON array into a list of clean URLs."""
        if not raw_url_str:
            return []

        if raw_url_str.startswith("[") and raw_url_str.endswith("]"):
            import json
            try:
                items = json.loads(raw_url_str)
                if isinstance(items, list):
                    def extract_url(item):
                        if isinstance(item, dict):
                            return item.get("url") or item.get("image") or item.get("src")
                        return item if isinstance(item, str) else None
                    
                    extracted = (extract_url(item) for item in items)
                    return [u.strip() for u in extracted if u and isinstance(u, str) and u.strip()]
            except json.JSONDecodeError:
                raw_url_str = raw_url_str.strip("[]")

        return [u.strip().strip("\"'") for u in raw_url_str.split(",") if u.strip()]

    @staticmethod
    def _extract_list(raw, results_key: str, max_results: int) -> list:
        """Walk a dot-path into the API response and return a capped item list."""
        items = raw
        if results_key:
            for key in results_key.split("."):
                items = items.get(key, []) if isinstance(items, dict) else []
        
        extracted = items if isinstance(items, list) else []
        
        # We don't want to aggressively truncate to 'max_results' if the user thinks 
        # it means 'page size'. We will let them paginate through up to 100 items.
        safety_cap = 100
        logger.info("[SendListing] _extract_list: Found %d items. Capping to %d for safety.", 
                    len(extracted), safety_cap)
        return extracted[:safety_cap]

    def _send_listing_card(self, execution, reply, items: list, start_index: int, cfg: dict):
        """Format and deliver up to `page_size` property cards."""
        total = len(items)
        page_size = min(20, max(1, int(cfg.get("max_results", 1))))
        
        for offset in range(page_size):
            index = start_index + offset
            if index >= total:
                break
                
            is_last_in_page = (offset == page_size - 1) or (index == total - 1)
            flat_item = flatten_dict(items[index]) if isinstance(items[index], dict) else {}
            card_vars = {
                **execution.variables,
                **{str(k): str(v) for k, v in flat_item.items()},
                "__index": str(index + 1),
                "__total": str(total),
            }
            card_text = self._interpolate_text(cfg["card_template"], card_vars)

            options = []
            if cfg["enable_book"]:
                options.append({"id": f"listing_book_{index}", "label": cfg["book_label"], "value": f"listing_book_{index}"})

            # Only add Next and Exit to the last card of the page to save button slots
            if is_last_in_page:
                if cfg["enable_next"] and (index + 1) < total:
                    options.append({"id": "listing_next", "label": cfg["next_label"], "value": "listing_next"})
                if cfg["enable_exit"]:
                    options.append({"id": "listing_exit", "label": cfg["exit_label"], "value": "listing_exit"})

            # WhatsApp requires at least 1 button for interactive messages
            if not options:
                options.append({"id": "listing_none", "label": "-", "value": "listing_none"})

            # Parse header image URL and additional album images if enabled
            header_url, additional_urls = "", []
            if cfg.get("enableImages", True):
                all_raw_urls = []
                
                # Use array if available, otherwise fallback to single string
                if cfg.get("card_image_templates"):
                    limits = cfg.get("card_image_limits") or []
                    for idx, template in enumerate(cfg["card_image_templates"]):
                        if template:
                            try:
                                limit = int(limits[idx]) if idx < len(limits) and limits[idx] != "" else 4
                            except (ValueError, TypeError):
                                limit = 4
                                
                            raw = self._interpolate_text(template, card_vars).strip()
                            urls = self._parse_image_urls(raw)
                            all_raw_urls.extend(urls[:limit])
                            
                elif cfg.get("card_image_template"):
                    try:
                        limit = int(cfg.get("imageLimit", 4))
                    except (ValueError, TypeError):
                        limit = 4
                    raw = self._interpolate_text(cfg["card_image_template"], card_vars).strip()
                    all_raw_urls = self._parse_image_urls(raw)[:limit]
                    
                if all_raw_urls:
                    # Deduplicate urls while preserving order
                    seen = set()
                    unique_urls = []
                    for u in all_raw_urls:
                        if u not in seen:
                            seen.add(u)
                            unique_urls.append(u)
                            
                    if unique_urls:
                        header_url = unique_urls[0]
                        additional_urls = unique_urls[1:]

            # Parse videos if enabled (they will be sent as standalone messages)
            all_video_urls = []
            if cfg.get("enableVideos", False):
                all_raw_video_urls = []
                
                if cfg.get("card_video_templates"):
                    limits = cfg.get("card_video_limits") or []
                    for idx, template in enumerate(cfg["card_video_templates"]):
                        if template:
                            try:
                                limit = int(limits[idx]) if idx < len(limits) and limits[idx] != "" else 1
                            except (ValueError, TypeError):
                                limit = 1
                                
                            raw = self._interpolate_text(template, card_vars).strip()
                            urls = self._parse_image_urls(raw)
                            all_raw_video_urls.extend(urls[:limit])

                elif cfg.get("card_video_template"):
                    try:
                        limit = int(cfg.get("videoLimit", 1))
                    except (ValueError, TypeError):
                        limit = 1
                    raw = self._interpolate_text(cfg["card_video_template"], card_vars).strip()
                    all_raw_video_urls = self._parse_image_urls(raw)[:limit]
                    
                if all_raw_video_urls:
                    seen = set()
                    unique_urls = []
                    for u in all_raw_video_urls:
                        if u not in seen:
                            seen.add(u)
                            unique_urls.append(u)
                            
                    if unique_urls:
                        # Just store all video URLs to send as standalone messages
                        all_video_urls = unique_urls

            if self.conv.instance and self.conv.instance.is_active:
                try:
                    from apps.messaging.utils import send_and_save_interactive_buttons, send_and_save_message, process_external_media_url
                    
                    # Dispatch all videos as standalone messages
                    for vid_url in all_video_urls:
                        try:
                            proc_url, proc_path = process_external_media_url(vid_url, "video", phone=self.conv.contact.phone)
                            send_and_save_message(
                                self.conv, msg_type="video", media_url=proc_url, 
                                storage_path=proc_path, sent_by=None
                            )
                        except Exception as vid_exc:
                            logger.error("[SendListing] Conv %s — video fail: %s", self.conv.id, vid_exc)

                    # Dispatch additional images as standalone messages (WhatsApp will group them as an album)
                    for img_url in additional_urls:
                        try:
                            proc_url, proc_path = process_external_media_url(img_url, "image", phone=self.conv.contact.phone)
                            send_and_save_message(
                                self.conv, msg_type="image", media_url=proc_url, 
                                storage_path=proc_path, sent_by=None
                            )
                        except Exception as img_exc:
                            logger.error("[SendListing] Conv %s — image fail: %s", self.conv.id, img_exc)

                    # Prepare and send the main interactive card with image header
                    proc_header_url = ""
                    if header_url:
                        proc_header_url, _ = process_external_media_url(header_url, "image", phone=self.conv.contact.phone)

                    send_and_save_interactive_buttons(
                        self.conv, 
                        body_text=card_text[:1024], 
                        options=options,
                        header_image_url=proc_header_url
                    )
                    logger.info("[SendListing] Conv %s — card %d/%d sent.", self.conv.id, index + 1, total)
                except Exception as exc:
                    logger.error("[SendListing] Conv %s — API failed (len=%d): %s", self.conv.id, len(card_text), exc)
            else:
                btn_lines = "\n".join(f"{i+1}. {o['label']}" for i, o in enumerate(options))
                reply.add_text(f"{card_text}\n\n{btn_lines}")


    def _resolve_interactive_id(self, inbound_text: str, execution) -> str:
        """
        Reads the button/list-reply ID from the latest inbound WhatsApp message.
        Falls back to mapping "1", "2", "3" plain-text to the correct action ID.
        """
        last = self.conv.messages.filter(direction="inbound").order_by("-timestamp").first()
        if last and last.raw_data:
            interactive = last.raw_data.get("interactive", {})
            i_type = interactive.get("type", "")
            logger.info(
                "[SendListing] Conv %s — raw_data interactive type='%s' data=%s",
                self.conv.id, i_type, interactive
            )
            if i_type == "button_reply":
                resolved = interactive.get("button_reply", {}).get("id", "").strip().lower()
                logger.info("[SendListing] Conv %s — resolved button_reply id='%s'", self.conv.id, resolved)
                if resolved.startswith("listing_book_") or resolved in ["listing_next", "listing_exit"]:
                    return resolved
            if i_type == "list_reply":
                resolved = interactive.get("list_reply",  {}).get("id", "").strip().lower()
                if resolved.startswith("listing_book_") or resolved in ["listing_next", "listing_exit"]:
                    return resolved
        else:
            logger.warning(
                "[SendListing] Conv %s — last inbound msg has no raw_data (msg_id=%s, msg_type=%s)",
                self.conv.id,
                last.id if last else None,
                last.msg_type if last else None,
            )

        text = inbound_text.strip().lower()
        if text in ["listing_next", "listing_exit"] or text.startswith("listing_book_"):
            return text
            
        # Optional: fallback for plain text if they typed exact label
        # Not implementing positional map here as page_size makes it overly complex
        return ""


    @staticmethod
    def _listing_clear_state(execution):
        """Remove temporary listing state from execution variables."""
        for key in ("__listing_results", "__listing_index", "__listing_total"):
            execution.variables.pop(key, None)
        execution.save(update_fields=["variables"])

    def _listing_advance(self, execution, node, reply, action="book"):
        """Continue flow traversal past the listing node."""
        execution.status = ExecutionStatus.RUNNING
        execution.save(update_fields=["status"])
        
        edge = node.outgoing_edges.filter(source_handle=action).first()
        if not edge and action == "book":
            # Fallback for old flows where handle was not specified
            edge = node.outgoing_edges.filter(source_handle__isnull=True).first() or node.outgoing_edges.first()
            
        if not edge:
            execution.complete()
            return reply if not reply.is_empty else None
            
        next_node = edge.target_node
        execution.current_node = next_node
        execution.save(update_fields=["current_node"])

        ctx = ChatbotContext(
            conversation_id=self.conv.id,
            contact_name=self.conv.contact.name or "",
            contact_wa_id=self.conv.contact.wa_id or "",
            inbound_message_body="",
            inbound_message_type="interactive",
            history=[],
        )
        
        self._traverse_flow(execution, node, ctx, reply, start_at=next_node)
        return reply if not reply.is_empty else None



    #  Resuming waiting executions (menu responses)                    
    def _resume_execution(
        self,
        execution: FlowExecution,
        ctx: ChatbotContext,
        inbound_text: str,
    ) -> Optional[ChatbotReply]:
        """Handle an inbound reply while execution is paused (WAITING)."""
        current_node = execution.current_node
        reply        = ChatbotReply()

        if current_node is None:
            logger.warning(
                "[AutomationEngine] Conv %s WAITING with no current_node — cancelling execution %s.",
                self.conv.id, execution.id,
            )
            execution.status = ExecutionStatus.CANCELLED
            execution.save(update_fields=["status"])
            return None

        if current_node.node_type in (NodeType.WAIT, "wait"):
            # Don't let user messages interrupt a timed delay
            return None

        if current_node.node_type in (NodeType.MENU, "menu"):
            return self._resume_menu(current_node, execution, ctx, reply, inbound_text)

        if current_node.node_type in (NodeType.COLLECT_INPUT, "collect_input"):
            return self._resume_collect_input(current_node, execution, ctx, reply, inbound_text)

        if current_node.node_type in (NodeType.WHATSAPP_FLOW, "whatsapp_flow"):
            import json
            last_inbound = (
                self.conv.messages.filter(direction="inbound")
                .order_by("-timestamp").first()
            )
            is_nfm_reply = False
            if last_inbound and last_inbound.raw_data:
                interactive_obj = last_inbound.raw_data.get("interactive", {})
                if interactive_obj.get("type") == "nfm_reply":
                    is_nfm_reply = True
                    nfm_reply = interactive_obj.get("nfm_reply", {})
                    response_json_str = nfm_reply.get("response_json", "{}")
                    try:
                        resp_data = json.loads(response_json_str)
                        if isinstance(resp_data, dict):
                            flow_token = resp_data.get("flow_token")
                            if flow_token:
                                try:
                                    from apps.flows.views import FlowDataExchangeView
                                    view = FlowDataExchangeView()
                                    resp_data = view._enrich_with_labels(resp_data, flow_token)
                                    
                                    whatsapp_flow = view._find_flow_by_token_cached(flow_token)
                                    if whatsapp_flow:
                                        flow_fields = view._get_all_flow_fields(whatsapp_flow)
                                        for field in flow_fields:
                                            execution.variables.pop(field, None)
                                            execution.variables.pop(f"{field}_label", None)
                                            execution.variables.pop(f"{field}_labels", None)
                                            execution.variables.pop(f"{field}_uuid", None)
                                except Exception as e:
                                    logger.error("[AutomationEngine] Failed to enrich flow labels: %s", e)

                            execution.variables.update(resp_data)
                            execution.save(update_fields=["variables"])

                            from apps.flows.models import FlowSubmission
                            sub = FlowSubmission.objects.filter(
                                conversation=self.conv,
                                completed=False
                            ).order_by('-created_at').first()
                            
                            if sub:
                                sub.screen_data = resp_data
                                sub.completed = True
                                sub.save(update_fields=["screen_data", "completed", "updated_at"])
                    except Exception as exc:
                        logger.error("[AutomationEngine] Failed to parse nfm_reply JSON: %s", exc)

            if is_nfm_reply:
                return self._resume_whatsapp_flow(current_node, execution, ctx, reply)

            logger.info(
                "[AutomationEngine] Conv %s is WAITING on whatsapp_flow node; text message received. Keeping flow active.",
                self.conv.id,
            )
            return None

        if current_node.node_type in (NodeType.SEND_LISTING, "send_listing"):
            return self._resume_send_listing(current_node, execution, ctx, reply, inbound_text)

        logger.warning(
            "[AutomationEngine] Conv %s WAITING on unexpected node type '%s'.",
            self.conv.id, current_node.node_type,
        )
        return None


    def _resume_menu(self, node, execution, ctx, reply, inbound_text):
        """Find which menu option the user picked and continue the flow."""
        options = node.config.get("options", [])
        selected = None

        # Also check interactive reply ID from raw WhatsApp payload
        interactive_reply_id = ""
        last_inbound = (
            self.conv.messages.filter(direction="inbound")
            .order_by("-timestamp").first()
        )
        if last_inbound and last_inbound.raw_data:
            interactive_obj = last_inbound.raw_data.get("interactive", {})
            i_type = interactive_obj.get("type", "")
            if i_type == "list_reply":
                interactive_reply_id = interactive_obj.get("list_reply", {}).get("id", "").strip().lower()
            elif i_type == "button_reply":
                interactive_reply_id = interactive_obj.get("button_reply", {}).get("id", "").strip().lower()

        for idx, opt in enumerate(options):
            val   = str(opt.get("value", "")).strip().lower()
            label = str(opt.get("label", "")).strip().lower()
            opt_id = str(opt.get("id", "")).strip().lower()
            if inbound_text in (val, label, str(idx + 1)) or (
                interactive_reply_id and interactive_reply_id in (opt_id, val, label)
            ):
                selected = opt
                break

        if selected:
            logger.info(
                "[AutomationEngine] Conv %s selected menu option: %s", self.conv.id, selected
            )
            self._log_step(execution, node, StepStatus.COMPLETED)

            edge = (
                node.outgoing_edges.filter(source_handle=selected.get("id")).first()
                or node.outgoing_edges.first()
            )
            if edge:
                execution.status = ExecutionStatus.RUNNING
                execution.current_node = edge.target_node
                execution.save(update_fields=["status", "current_node"])
                self._traverse_flow(execution, node, ctx, reply, start_at=edge.target_node)
            else:
                execution.complete()
        else:
            # If the user gives a large input instead of selecting a menu option, 
            # assume it's a description meant for the AI. If next node is AI, advance to it.
            if len(inbound_text) > 60 or len(inbound_text.split()) > 10:
                ai_control_edge = node.outgoing_edges.filter(target_node__node_type__in=["ai_control", NodeType.AI_CONTROL]).first()
                if ai_control_edge:
                    logger.info(
                        "[AutomationEngine] Conv %s provided long input during menu. Advancing to AI Control node.", 
                        self.conv.id
                    )
                    self._log_step(execution, node, StepStatus.COMPLETED)
                    execution.status = ExecutionStatus.RUNNING
                    execution.current_node = ai_control_edge.target_node
                    execution.save(update_fields=["status", "current_node"])
                    self._traverse_flow(execution, node, ctx, reply, start_at=ai_control_edge.target_node)
                    return reply if not reply.is_empty else None

            logger.info("[AutomationEngine] Conv %s invalid menu reply.", self.conv.id)
            invalid_msg = (
                node.config.get("invalidOptionMessage")
                or node.config.get("noMatchMessage")
            )
            if invalid_msg:
                reply.add_text(invalid_msg)
            # Execution remains WAITING

        return reply if not reply.is_empty else None


    ## Trigger matching
    def _find_trigger(self, inbound_text: str):
        """Return (flow, trigger_node) for the first matching active flow, or (None, None)."""
        flows = AutomationFlow.objects.filter(
            Q(instance_id=self.conv.instance_id) | Q(instance__isnull=True),
            status=FlowStatus.ACTIVE,
        ).prefetch_related("nodes", "edges")

        for flow in flows:
            for node in flow.nodes.filter(node_type=NodeType.TRIGGER):
                trigger_type = node.config.get("triggerType")

                if trigger_type == TriggerType.KEYWORD:
                    keywords   = node.config.get("keywords", [])
                    match_type = node.config.get("matchType", "contains")
                    if self._evaluate_keyword_match(inbound_text, keywords, match_type):
                        return flow, node

                elif trigger_type == TriggerType.INBOUND_MESSAGE:
                    return flow, node

        return None, None


    ### Condition evaluation                                             
    def _evaluate_conditions(self, conditions: list, ctx: ChatbotContext) -> bool:
        """AND-logic across all conditions. Returns False when list is empty."""
        if not conditions:
            return False
        return all(self._evaluate_condition(cond, ctx) for cond in conditions)

    def _evaluate_condition(self, cond: dict, ctx: ChatbotContext) -> bool:
        """Evaluate a single condition dict against the current context."""
        field        = cond.get("field", "message")
        operator     = cond.get("operator", "equals")
        expected_val = str(cond.get("value", "")).strip().lower()

        # Resolve the field value from context 
        if field == "message":
            actual_val = (ctx.inbound_message_body or "").strip().lower()
            
        elif field == "phone":
            actual_val = str(self.conv.contact.phone).strip().lower()

        elif field == "user_tag":
            msg_tags = []
            if isinstance(self.conv.contact.tags, list):
                msg_tags = [str(t).strip().lower() for t in self.conv.contact.tags]
                
            crm_tags = []
            if getattr(self.conv.contact, 'crm_contact', None):
                crm_tags = [str(t.name).strip().lower() for t in self.conv.contact.crm_contact.tags.all()]
                
            # Combine and deduplicate
            tags = list(set(msg_tags + crm_tags))

            if operator in ("equals", "exact"):
                return expected_val in tags
            elif operator == "contains":
                return any(expected_val in t for t in tags)
            elif operator == "not_contain":
                return not any(expected_val in t for t in tags)
            
            # fallback for other operators
            actual_val = " ".join(tags)
        else:
            actual_val = ""

        if operator in ("equals", "exact") and field != "user_tag":
            return actual_val == expected_val
        elif operator == "contains" and field != "user_tag":
            norm_exp = re.sub(r"\s+", " ", expected_val)
            norm_act = re.sub(r"\s+", " ", actual_val)
            return bool(re.search(rf"\b{re.escape(norm_exp)}\b", norm_act))
        elif operator == "not_contain" and field != "user_tag":
            norm_exp = re.sub(r"\s+", " ", expected_val)
            norm_act = re.sub(r"\s+", " ", actual_val)
            return not bool(re.search(rf"\b{re.escape(norm_exp)}\b", norm_act))
        elif operator == "starts_with":
            return actual_val.startswith(expected_val)

        if field == "user_tag":
            return False

        logger.warning("[AutomationEngine] Unknown operator '%s'.", operator)
        return False


    ## Keyword matching   
    def _evaluate_keyword_match(
        self,
        inbound_text: str,
        keywords: list,
        match_type: str,
    ) -> bool:
        for kw in keywords:
            if not kw.strip():
                continue
            kw_lower = self._normalize_text(kw)
            if match_type == "exact":
                if inbound_text == kw_lower:
                    return True
            else:  # contains
                if re.search(rf"\b{re.escape(kw_lower)}\b", inbound_text):
                    return True
        return False


    ######  Shared helpers   ######
    @staticmethod
    def _log_step(execution, node, status: str):
        """Create a FlowStepLog entry for the given node."""
        FlowStepLog.objects.create(
            execution=execution,
            node=node,
            status=status,
            node_config_snapshot=node.config,
        )

    @staticmethod
    def _advance_to_next(execution, node):
        """
        Follow the first outgoing edge from node.
        Updates execution.current_node and saves. Returns next node or None.
        """
        edge = node.outgoing_edges.first()
        if not edge:
            return None
        next_node = edge.target_node
        execution.current_node = next_node
        execution.save(update_fields=["current_node"])
        return next_node

    @staticmethod
    def _normalize_text(text: str) -> str:
        return re.sub(r"\s+", " ", text.strip().lower())

    @staticmethod
    def _resolve_variable(variables: dict, path: str):
        """
        Resolve a dot-notation path against the variables dict.

        Examples:
            path="name"                    → variables["name"]
            path="results.0.name"          → variables["results"][0]["name"]
            path="properties.price"        → variables["properties"]["price"]

        Returns the resolved value, or the original path string if not found.
        """
        if path in variables:
            return variables[path]
            
        parts = path.split(".")
        value = variables
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            elif isinstance(value, list):
                try:
                    value = value[int(part)]
                except (ValueError, IndexError):
                    return path  # can't resolve — return path unchanged
            else:
                return path  # dead end
            if value is None:
                return ""
        return value

    @classmethod
    def _interpolate_text(cls, text: str, variables: dict) -> str:
        """
        Replace {{var_name}} and {{dot.path.access}} placeholders with values
        from variables dict. Missing paths are replaced with empty strings.
        """
        if not text or not isinstance(text, str):
            return text
        import re
        def replacer(match):
            path = match.group(1).strip()
            if path.startswith("__"):
                return match.group(0)  # keep private vars as-is
            resolved = cls._resolve_variable(variables or {}, path)
            if resolved is None or resolved == path:
                # path not found — return empty string to prevent leaking to customer
                return ""
            if isinstance(resolved, (dict, list)):
                import json
                return json.dumps(resolved, ensure_ascii=False)
            return str(resolved)
        return re.sub(r"\{\{([^}]+)\}\}", replacer, text)

    @staticmethod
    def _compute_delay_seconds(config: dict) -> int:
        """Convert delayValue + delayUnit config to total seconds."""
        value = int(config.get("delayValue", 0))
        unit  = config.get("delayUnit", "seconds")
        multipliers = {
            "seconds": 1,
            "minutes": 60,
            "hours":   3_600,
            "days":    86_400,
        }
        return value * multipliers.get(unit, 1)

    @staticmethod
    def _validate_input(value: str, validation_type: str) -> tuple[bool, str]:
        """
            any      — accepts anything non-empty
            number   — must be a valid integer or decimal
            email    — basic email format check
            phone    — digits only (7-15 chars, optional leading +)
            text     — non-empty string (same as any, explicit alias)
        """
        v = value.strip()
        if not v:
            return False, ""

        if validation_type in ("any", "text"):
            return True, v

        if validation_type == "number":
            try:
                float(v.replace(",", ""))
                return True, v
            except ValueError:
                return False, ""

        if validation_type == "email":
            return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v)), v

        if validation_type == "phone":
            digits = re.sub(r"[\s\-()]", "", v)
            return bool(re.fullmatch(r"\+?\d{7,15}", digits)), digits

        return True, v
