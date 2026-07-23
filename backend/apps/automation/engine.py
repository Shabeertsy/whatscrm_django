import logging
from typing import Optional
from django.utils import timezone
from django.db.models import Q
from apps.ai.chatbot.base import BaseChatbotEngine, ChatbotContext, ChatbotReply
from apps.automation.models import (
    AutomationFlow, FlowExecution, FlowStepLog, FlowStatus,
    NodeType, StepStatus, ExecutionStatus, TriggerType
)
from apps.messaging.models import Conversation

logger = logging.getLogger(__name__)



class AutomationEngine(BaseChatbotEngine):
    def __init__(self, conversation: Conversation):
        self.conv = conversation

    def generate_reply(self, ctx: ChatbotContext) -> Optional[ChatbotReply]:
        import re
        inbound_text = re.sub(r"\s+", " ", (ctx.inbound_message_body or "").strip().lower())

        #  Check for a WAITING execution for this contact
        waiting_execution = FlowExecution.objects.filter(
            contact=self.conv.contact,
            status=ExecutionStatus.WAITING
        ).first()

        if waiting_execution:
            return self._resume_execution(waiting_execution, ctx, inbound_text)

        #  Get active flows for this instance 
        flows = AutomationFlow.objects.filter(
            Q(instance_id=self.conv.instance_id) | Q(instance__isnull=True),
            status=FlowStatus.ACTIVE
        ).prefetch_related('nodes', 'edges')

        triggered_flow = None
        trigger_node = None

        for flow in flows:
            # Find a trigger node in this flow
            for node in flow.nodes.filter(node_type=NodeType.TRIGGER):
                trigger_type = node.config.get("triggerType")
                if trigger_type == TriggerType.KEYWORD:
                    keywords = node.config.get("keywords", [])
                    match_type = node.config.get("matchType", "contains")
                    
                    matched = False
                    for kw in keywords:
                        if not kw.strip(): continue
                        kw_lower = re.sub(r"\s+", " ", kw.strip().lower())
                        if match_type == "exact":
                            if inbound_text.lower() == kw_lower:
                                matched = True
                                break
                        else: # contains (whole word match)
                            import re
                            print(re.search(rf"\b{re.escape(kw_lower)}\b", inbound_text.lower()))
                            if re.search(rf"\b{re.escape(kw_lower)}\b", inbound_text.lower()) is not None:
                                print('contain matched')
                                matched = True
                                break
                    
                    if matched:
                        triggered_flow = flow
                        trigger_node = node
                        break
                    
                elif trigger_type == TriggerType.INBOUND_MESSAGE:
                    triggered_flow = flow
                    trigger_node = node
                    break
            
            if triggered_flow:
                break

        if not triggered_flow or not trigger_node:
            return None

        logger.info(f"[AutomationEngine] Flow '{triggered_flow.name}' triggered for Conv {self.conv.id}")

        # Create Execution
        execution = FlowExecution.objects.create(
            flow=triggered_flow,
            contact=self.conv.contact,
            status=ExecutionStatus.RUNNING,
            current_node=trigger_node
        )

        # Log trigger step
        FlowStepLog.objects.create(
            execution=execution,
            node=trigger_node,
            status=StepStatus.COMPLETED,
            node_config_snapshot=trigger_node.config
        )

        reply = ChatbotReply()
        self._traverse_flow(execution, trigger_node, ctx, reply)
        return reply

    def _resume_execution(self, execution: FlowExecution, ctx: ChatbotContext, inbound_text: str) -> Optional[ChatbotReply]:
        current_node = execution.current_node
        reply = ChatbotReply()

        if current_node is None:
            logger.warning(f"[AutomationEngine] Conv {self.conv.id} WAITING on execution {execution.id} with no current_node. Cancelling.")
            execution.status = ExecutionStatus.CANCELLED
            execution.save(update_fields=["status"])
            return None

        if current_node.node_type == NodeType.MENU:
            options = current_node.config.get("options", [])
            
            # Find the option that matches the user's input
            selected_option = None
            for idx, opt in enumerate(options):
                val = str(opt.get("value", "")).strip().lower()
                label = str(opt.get("label", "")).strip().lower()
                if inbound_text == val or inbound_text == label or inbound_text == str(idx + 1):
                    selected_option = opt
                    break
            
            if selected_option:
                logger.info(f"[AutomationEngine] Conv {self.conv.id} selected menu option: {selected_option}")
                # Mark menu step completed
                FlowStepLog.objects.create(
                    execution=execution,
                    node=current_node,
                    status=StepStatus.COMPLETED,
                    node_config_snapshot=current_node.config
                )
                
                # Find the edge for this specific option
                edge = current_node.outgoing_edges.filter(source_handle=selected_option.get("id")).first()
                if not edge:
                    edge = current_node.outgoing_edges.first()
                
                if edge:
                    execution.status = ExecutionStatus.RUNNING
                    execution.save(update_fields=["status"])
                    
                    next_node = edge.target_node
                    execution.current_node = next_node
                    execution.save(update_fields=["current_node"])
                    
                    self._traverse_flow(execution, current_node, ctx, reply, specific_next_node=next_node)
                else:
                    execution.complete()
            else:
                logger.info(f"[AutomationEngine] Conv {self.conv.id} invalid menu reply.")
                invalid_msg = current_node.config.get("invalidOptionMessage") or current_node.config.get("noMatchMessage")
                if invalid_msg:
                    reply.add_text(invalid_msg)
                # Execution remains WAITING
        
        return reply if not reply.is_empty else None

    def _traverse_flow(self, execution: FlowExecution, start_node, ctx: ChatbotContext, reply: ChatbotReply, specific_next_node=None):
        current_node = specific_next_node
        
        if specific_next_node is None:
            edges = start_node.outgoing_edges.all()
            if not edges.exists():
                execution.complete()
                return
            current_node = edges.first().target_node
            execution.current_node = current_node
            execution.save(update_fields=["current_node"])

        while current_node:
            if current_node.node_type in (NodeType.ACTION, "action"):
                message_text = current_node.config.get("message", "")
                message_text = message_text.replace("{{contact_name}}", ctx.contact_name)

                media_url = current_node.config.get("mediaUrl", "")
                media_type = current_node.config.get("mediaType", "")

                if media_url and media_type:
                    msg_type = media_type.split("/")[0] if "/" in media_type else "image"
                    if msg_type not in ["image", "video", "audio", "document"]:
                        msg_type = "document"
                    reply.add_media(msg_type=msg_type, media_url=media_url, caption=message_text)
                else:
                    reply.add_text(message_text)

                FlowStepLog.objects.create(
                    execution=execution,
                    node=current_node,
                    status=StepStatus.COMPLETED,
                    node_config_snapshot=current_node.config
                )

                edges = current_node.outgoing_edges.all()
                if not edges.exists():
                    execution.complete()
                    break
                
                next_node = edges.first().target_node
                execution.current_node = next_node
                execution.save(update_fields=["current_node"])
                current_node = next_node

            elif current_node.node_type in (NodeType.MENU, "menu"):
                message_text = current_node.config.get("message", "Please choose an option:")
                options = current_node.config.get("options", [])
                
                formatted_menu = [message_text]
                for idx, opt in enumerate(options):
                    label = opt.get("label", f"Option {idx+1}")
                    formatted_menu.append(f"{idx+1}. {label}")
                
                reply.add_text("\n".join(formatted_menu))
                
                execution.status = ExecutionStatus.WAITING
                execution.save(update_fields=["status"])
                
                FlowStepLog.objects.create(
                    execution=execution,
                    node=current_node,
                    status=StepStatus.PENDING,
                    node_config_snapshot=current_node.config
                )
                break
                
            elif current_node.node_type in (NodeType.CONDITION, "condition"):
                conditions = current_node.config.get("conditions", [])
                print("condition..........")
                
                # Evaluate conditions (AND logic)
                # If no conditions, defaults to False (No branch)
                is_true = False
                if conditions:
                    is_true = True
                    for cond in conditions:
                        field = cond.get("field", "message")
                        operator = cond.get("operator", "equals")
                        expected_val = str(cond.get("value", "")).strip().lower()
                        
                        # Get actual value
                        actual_val = ""
                        if field == "message":
                            actual_val = (ctx.inbound_message_body or "").strip().lower()
                        elif field == "phone":
                            actual_val = str(self.conv.contact.phone).strip().lower()
                        elif field == "user_tag":
                            tags = self.conv.contact.tags or []
                            actual_val = " ".join([str(t).strip().lower() for t in tags])
                        
                        # Evaluate operator
                        matched = False
                        if operator == "equals":
                            matched = (actual_val == expected_val)
                            
                        elif operator == "contains":
                            import re
                            norm_expected = re.sub(r"\s+", " ", expected_val)
                            norm_actual = re.sub(r"\s+", " ", actual_val)
                            print(f"[DEBUG] condition checking: '{norm_expected}' in '{norm_actual}'")
                            matched = (re.search(rf"\b{re.escape(norm_expected)}\b", norm_actual) is not None)
                            if matched:
                                print('matched rrrrrrrrr')
                        elif operator == "starts_with":
                            matched = actual_val.startswith(expected_val)
                        
                        if not matched:
                            is_true = False
                            break
                
                # Log condition step
                FlowStepLog.objects.create(
                    execution=execution,
                    node=current_node,
                    status=StepStatus.COMPLETED,
                    node_config_snapshot=current_node.config
                )
                
                # Find appropriate edge (source_handle="true" or "false")
                handle_id = "true" if is_true else "false"
                edge = current_node.outgoing_edges.filter(source_handle=handle_id).first()
                
                if edge:
                    next_node = edge.target_node
                    execution.current_node = next_node
                    execution.save(update_fields=["current_node"])
                    current_node = next_node
                else:
                    execution.complete()
                    break

            else:
                logger.warning(f"[AutomationEngine] Unhandled node type '{current_node.node_type}', stopping traversal.")
                break
