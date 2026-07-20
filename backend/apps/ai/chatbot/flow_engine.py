"""
Flow Engine — handles keyword/menu-driven chatbot flows.

CURRENT STATE: Scaffold ready. Each FlowBot and its nodes are stored in the DB.
The engine is wired into the dispatcher but returns None until flows are configured,
so it's completely safe to ship now.

FUTURE: Replace the `_execute_node` stubs with real logic and the UI builder
will drive this with zero changes to the dispatcher or task layer.
"""
import logging
from typing import Optional

from .base import BaseChatbotEngine, ChatbotContext, ChatbotReply

logger = logging.getLogger(__name__)


class FlowEngine(BaseChatbotEngine):
    """
    Executes a keyword/button-driven conversation flow.

    A flow is a directed graph of nodes:
      - TextNode       → sends a text message
      - QuickReplyNode → sends buttons, waits for a keyword
      - ConditionNode  → branches on user input
      - HandoffNode    → disables ai_active, escalates to human agent
      - (future) APICallNode, DelayNode, etc.

    The engine tracks which node a conversation is currently at via
    `ConversationFlowState` (see models.py).
    """

    def __init__(self, flow):
        """
        flow: FlowBot model instance (already validated by dispatcher)
        """
        self.flow = flow

    def generate_reply(self, ctx: ChatbotContext) -> Optional[ChatbotReply]:
        """
        Main entry point. Looks up the conversation's current flow state,
        advances the node based on user input, and returns replies.
        """
        try:
            from apps.ai.models import ConversationFlowState, FlowNode

            state, _ = ConversationFlowState.objects.get_or_create(
                conversation_id=ctx.conversation_id,
                flow=self.flow,
                defaults={"current_node": self.flow.start_node},
            )

            if state.current_node is None:
                logger.warning(f"[FlowEngine] Flow {self.flow.id} has no start_node set.")
                return None

            return self._execute_node(state, ctx)

        except Exception as exc:
            logger.exception(f"[FlowEngine] Error processing flow: {exc}")
            return None

    # ------------------------------------------------------------------
    # Node execution
    # ------------------------------------------------------------------

    def _execute_node(self, state, ctx: ChatbotContext) -> Optional[ChatbotReply]:
        node = state.current_node
        reply = ChatbotReply()

        node_type = node.node_type

        if node_type == "text":
            reply.add_text(node.content.get("message", ""))
            next_node = node.children.first()
            self._advance_state(state, next_node)

        elif node_type == "quick_reply":
            # Send options as a text message (WhatsApp doesn't support native buttons yet via Cloud API)
            options = node.content.get("options", [])
            message = node.content.get("message", "Please choose an option:")
            options_text = "\n".join(f"{i+1}. {opt['label']}" for i, opt in enumerate(options))
            reply.add_text(f"{message}\n\n{options_text}")
            # Don't advance — stay on this node waiting for input
            # The next call will match the user's reply

        elif node_type == "input_match":
            # User already replied — match their input to a branch
            user_input = ctx.inbound_message_body.strip().lower()
            matched_child = self._match_child(node, user_input)
            if matched_child:
                self._advance_state(state, matched_child)
                # Re-execute with the new node (depth-first, one hop)
                return self._execute_node(state, ctx)
            else:
                # No match → repeat the prompt
                reply.add_text(node.content.get("no_match_message", "Sorry, I didn't understand. Please choose from the options above."))

        elif node_type == "handoff":
            message = node.content.get("message", "Connecting you to a human agent, please hold on.")
            reply.add_text(message)
            # Signal to the dispatcher that AI should be disabled for this conversation
            state.is_complete = True
            state.save(update_fields=["is_complete"])

        elif node_type == "end":
            end_message = node.content.get("message", "")
            if end_message:
                reply.add_text(end_message)
            state.is_complete = True
            state.save(update_fields=["is_complete"])

        else:
            logger.warning(f"[FlowEngine] Unknown node_type: {node_type}")
            return None

        return reply if not reply.is_empty else None

    def _match_child(self, node, user_input: str):
        """Find the first child node whose keywords match the user's input."""
        for child in node.children.all():
            keywords = child.match_keywords or []
            for kw in keywords:
                if kw.lower() in user_input or user_input == kw.lower():
                    return child
        return None

    def _advance_state(self, state, next_node):
        state.current_node = next_node
        if next_node is None:
            state.is_complete = True
        state.save(update_fields=["current_node", "is_complete"])
