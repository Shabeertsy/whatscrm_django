import logging
from typing import Optional

from apps.messaging.models import Conversation
from apps.messaging.utils import (
    send_and_save_message,
    broadcast_conversation_update,
)
from .base import ChatbotContext, ChatbotReply


logger = logging.getLogger(__name__)

HISTORY_WINDOW = 15


class ChatbotDispatcher:
    """
    Builds context, resolves the AI engine, and persists/broadcasts the reply.
    Automation is handled upstream (in messaging/tasks.py), not here.
    """

    def __init__(self, conversation: Conversation):
        self.conv = conversation


    def dispatch(self) -> bool:
        """Run the AI engine and send its reply. Returns True if a reply was sent."""
        ctx = self._build_context()
        if ctx is None:
            return False

        ai_engine = self._resolve_ai_engine()
        if ai_engine is None:
            logger.info("[Dispatcher] Conv %s: no AI engine resolved, skipping.", self.conv.id)
            return False

        reply: Optional[ChatbotReply] = ai_engine.generate_reply(ctx)
        if reply and not reply.is_empty:
            self._persist_and_broadcast(reply)
            logger.info("[Dispatcher] Conv %s: AI reply sent.", self.conv.id)
            return True

        logger.info("[Dispatcher] Conv %s: AI returned no reply.", self.conv.id)
        return False


    def _build_context(self) -> Optional[ChatbotContext]:
        """Build an immutable snapshot of everything an engine needs."""
        last_inbound = (
            self.conv.messages
            .filter(direction="inbound")
            .order_by("-timestamp")
            .first()
        )
        if last_inbound is None:
            return None

        history_qs = self.conv.messages.order_by("-timestamp")[:HISTORY_WINDOW]
        history = [
            {
                "role": "user" if msg.direction == "inbound" else "assistant",
                "content": msg.body or f"[{msg.msg_type}]",
            }
            for msg in reversed(list(history_qs))
        ]

        contact_name = self.conv.contact.name
        try:
            if self.conv.contact.crm_contact:
                contact_name = self.conv.contact.crm_contact.name
        except Exception:
            pass

        return ChatbotContext(
            conversation_id=self.conv.id,
            contact_name=contact_name or self.conv.contact.phone,
            contact_wa_id=self.conv.contact.wa_id,
            inbound_message_body=last_inbound.body,
            inbound_message_type=last_inbound.msg_type,
            history=history,
        )

    # ------------------------------------------------------------------ #
    #  AI engine resolution                                                #
    # ------------------------------------------------------------------ #

    def _resolve_ai_engine(self):
        """Return a ready AIEngine instance, or None if not configured."""
        try:
            from apps.ai.models import AIAgentSettings
            from apps.ai.chatbot.ai_engine import AIEngine

            ai_settings = AIAgentSettings.objects.filter(is_active=True).first()

            if not ai_settings:
                logger.debug("[Dispatcher] No active AIAgentSettings found.")
                return None
            if not ai_settings.provider:
                logger.debug("[Dispatcher] AIAgentSettings has no provider.")
                return None
            if not ai_settings.provider.ai_provider_api_key:
                logger.warning("[Dispatcher] Provider API key is missing.")
                return None

            return AIEngine(ai_settings)

        except Exception as exc:
            logger.exception("[Dispatcher] Failed to resolve AI engine: %s", exc)
            return None

    def _persist_and_broadcast(self, reply: ChatbotReply):
        """Send each reply part via the shared utility and broadcast the conversation update."""
        for part in reply.messages:
            send_and_save_message(
                self.conv,
                msg_type=part["msg_type"],
                body=part["body"],
                media_url=part.get("media_url", ""),
                sent_by=None,
            )
        broadcast_conversation_update(self.conv)
