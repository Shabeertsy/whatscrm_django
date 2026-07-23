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
        inbound_text = (ctx.inbound_message_body or "").strip().lower()

        # Get active flows for this instance 
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
                        kw_lower = kw.lower()
                        if match_type == "exact":
                            if inbound_text == kw_lower:
                                matched = True
                                break
                        else: # contains
                            if kw_lower in inbound_text:
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

        # Traverse and execute synchronous nodes (like ACTION)
        current_node = trigger_node
        while current_node:
            edges = current_node.outgoing_edges.all()
            if not edges.exists():
                execution.complete()
                break
            
            # Simple traversal (taking the first edge)
            next_edge = edges.first()
            next_node = next_edge.target_node

            execution.current_node = next_node
            execution.save(update_fields=["current_node"])

            if next_node.node_type == NodeType.ACTION:
                # Send Message action
                message_text = next_node.config.get("message", "")
                
                # Basic variable interpolation: {{contact_name}}
                message_text = message_text.replace("{{contact_name}}", ctx.contact_name)

                media_url = next_node.config.get("mediaUrl", "")
                media_type = next_node.config.get("mediaType", "")

                if media_url and media_type:
                    # Determine type for WhatsApp (image, video, document, audio)
                    msg_type = media_type.split("/")[0] if "/" in media_type else "image"
                    if msg_type not in ["image", "video", "audio", "document"]:
                        msg_type = "document"
                    reply.add_media(msg_type=msg_type, media_url=media_url, caption=message_text)
                else:
                    reply.add_text(message_text)

                # Log action step
                FlowStepLog.objects.create(
                    execution=execution,
                    node=next_node,
                    status=StepStatus.COMPLETED,
                    node_config_snapshot=next_node.config
                )

                # Move to next node in loop
                current_node = next_node
            else:
                logger.warning(f"[AutomationEngine] Unhandled node type '{next_node.node_type}', stopping traversal.")
                break

        return reply
