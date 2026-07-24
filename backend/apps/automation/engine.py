import re
import logging
from typing import Optional

from django.conf import settings
from django.db.models import Q

from apps.ai.chatbot.base import BaseChatbotEngine, ChatbotContext, ChatbotReply
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

        # Resume an existing WAITING execution (e.g. user answered a menu)
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

            elif node_type in (NodeType.AI_CONTROL, "ai_control"):
                result = self._handle_ai_control_node(current_node, execution, ctx, reply)

            elif node_type in (NodeType.HTTP_REQUEST, "http_request"):
                result = self._handle_http_request_node(current_node, execution)

            else:
                logger.warning(
                    "[AutomationEngine] Unhandled node type '%s' — stopping traversal.", node_type
                )
                result = _STOP

            # Sentinels end the loop; a FlowNode continues it
            if result in (_STOP, _WAITING, _DELAYED) or result is None:
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

        if media_url and media_type:
            msg_type = media_type.split("/")[0] if "/" in media_type else "image"
            if msg_type not in ("image", "video", "audio", "document"):
                msg_type = "document"
            reply.add_media(msg_type=msg_type, media_url=media_url, caption=message_text)
        else:
            reply.add_text(message_text)

        self._log_step(execution, node, StepStatus.COMPLETED)

        next_node = self._advance_to_next(execution, node)
        if next_node is None:
            execution.complete()
            return _STOP
        return next_node

    def _handle_menu_node(self, node, execution, reply):
        """Present a numbered menu and pause execution waiting for user input."""
        message_text = node.config.get("message", "Please choose an option:")
        options      = node.config.get("options", [])

        lines = [message_text]
        for idx, opt in enumerate(options):
            lines.append(f"{idx + 1}. {opt.get('label', f'Option {idx + 1}')}")
        reply.add_text("\n".join(lines))

        execution.status = ExecutionStatus.WAITING
        execution.save(update_fields=["status"])
        self._log_step(execution, node, StepStatus.PENDING)
        return _WAITING

    def _handle_condition_node(self, node, execution, ctx):
        """Evaluate conditions and follow the true/false edge."""
        conditions = node.config.get("conditions", [])
        is_true    = self._evaluate_conditions(conditions, ctx)

        logger.debug(
            "[AutomationEngine] Condition node %s → %s", node.node_id, is_true
        )
        self._log_step(execution, node, StepStatus.COMPLETED)

        handle_id = "true" if is_true else "false"
        edge = node.outgoing_edges.filter(source_handle=handle_id).first()
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

        # --- Update a contact field ---
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
            # Update WhatsApp Contact directly writable fields
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

        # --- Add a tag to the WhatsApp Contact ---
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

    def _handle_http_request_node(self, node, execution):
        """
        Execute an HTTP request and optionally save the response to a variable.
        """
        import requests
        
        http_method = node.config.get("httpMethod", "GET").upper()
        url         = self._interpolate_text(node.config.get("url", ""), execution.variables)
        headers     = node.config.get("headers", {})
        req_body    = node.config.get("requestBody")
        resp_var    = node.config.get("responseVariable", "")

        if not url:
            logger.warning("[AutomationEngine] Conv %s HTTP Request node missing URL.", self.conv.id)
        else:
            # Interpolate headers
            interpolated_headers = {}
            for k, v in headers.items():
                interpolated_headers[k] = self._interpolate_text(str(v), execution.variables)
    
            # Interpolate request body
            if isinstance(req_body, str):
                req_body = self._interpolate_text(req_body, execution.variables)
            elif isinstance(req_body, dict):
                req_body = req_body.copy()
                for k, v in req_body.items():
                    if isinstance(v, str):
                        req_body[k] = self._interpolate_text(v, execution.variables)
    
            try:
                logger.info("[AutomationEngine] Conv %s HTTP %s %s", self.conv.id, http_method, url)
                if http_method == "GET":
                    response = requests.get(url, headers=interpolated_headers, timeout=10)
                elif http_method == "POST":
                    if isinstance(req_body, dict):
                        response = requests.post(url, headers=interpolated_headers, json=req_body, timeout=10)
                    else:
                        response = requests.post(url, headers=interpolated_headers, data=req_body, timeout=10)
                elif http_method == "PUT":
                    if isinstance(req_body, dict):
                        response = requests.put(url, headers=interpolated_headers, json=req_body, timeout=10)
                    else:
                        response = requests.put(url, headers=interpolated_headers, data=req_body, timeout=10)
                else:
                    response = requests.request(http_method, url, headers=interpolated_headers, data=req_body, timeout=10)
                
                if resp_var:
                    try:
                        resp_data = response.json()
                    except ValueError:
                        resp_data = response.text
                    
                    execution.variables[resp_var] = resp_data
                    execution.save(update_fields=["variables"])
                    logger.info("[AutomationEngine] Conv %s HTTP response saved to '%s'", self.conv.id, resp_var)
    
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
                    # Append the AI's messages to the automation's outbound batch!
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

        logger.warning(
            "[AutomationEngine] Conv %s WAITING on unexpected node type '%s'.",
            self.conv.id, current_node.node_type,
        )
        return None

    def _resume_menu(self, node, execution, ctx, reply, inbound_text):
        """Find which menu option the user picked and continue the flow."""
        options = node.config.get("options", [])
        selected = None

        for idx, opt in enumerate(options):
            val   = str(opt.get("value", "")).strip().lower()
            label = str(opt.get("label", "")).strip().lower()
            if inbound_text in (val, label, str(idx + 1)):
                selected = opt
                break

        if selected:
            logger.info(
                "[AutomationEngine] Conv %s selected menu option: %s", self.conv.id, selected
            )
            self._log_step(execution, node, StepStatus.COMPLETED)

            # Prefer the edge tied to this specific option handle
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
            else:  # contains — whole-word match
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
    def _interpolate_text(text: str, variables: dict) -> str:
        """Replace {{var_name}} placeholders with values from variables."""
        if not text or not isinstance(text, str):
            return text
        for var_name, var_value in (variables or {}).items():
            if not var_name.startswith("__"):
                text = text.replace(f"{{{{{var_name}}}}}", str(var_value))
        return text

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
