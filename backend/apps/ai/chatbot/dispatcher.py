import logging
from typing import Optional

from django.utils import timezone

from apps.messaging.models import Conversation, Message
from apps.messaging.utils import (
    send_whatsapp_message,
    broadcast_new_message,
    broadcast_conversation_update,
)
from .base import ChatbotContext, ChatbotReply


logger = logging.getLogger(__name__)

HISTORY_WINDOW = 15



class ChatbotDispatcher:

    def __init__(self, conversation: Conversation):
        self.conv = conversation


    # Public entry point
    # ------------------------------------------------------------------
    def dispatch(self) -> bool:
        """
        Determine which engine to use, generate a reply, persist it, and
        broadcast it to the UI via WebSocket.

        Returns True if a reply was sent, False otherwise.
        """
        ctx = self._build_context()
        if ctx is None:
            return False

        engine, engine_label = self._resolve_engine()
        if engine is None:
            logger.info(f"[Dispatcher] Conv {self.conv.id}: no engine resolved, skipping.")
            return False

        logger.info(f"[Dispatcher] Conv {self.conv.id}: using engine='{engine_label}'")

        reply: Optional[ChatbotReply] = engine.generate_reply(ctx)

        if reply is None or reply.is_empty:
            logger.info(f"[Dispatcher] Conv {self.conv.id}: engine returned no reply.")
            return False

        self._persist_and_broadcast(reply)

        # Post-dispatch: check if flow engine triggered a handoff
        self._check_handoff_after_flow()
        return True


    # Context assembly
    # -------------------------------------------------------------
    def _build_context(self) -> Optional[ChatbotContext]:
        """Build an immutable context snapshot from the conversation."""
        last_inbound = (
            self.conv.messages
            .filter(direction="inbound")
            .order_by("-timestamp")
            .first()
        )
        if last_inbound is None:
            return None

        history_qs = (
            self.conv.messages
            .order_by("-timestamp")
            [:HISTORY_WINDOW]
        )
        history = []
        for msg in reversed(history_qs):
            role = "user" if msg.direction == "inbound" else "assistant"
            body = msg.body if msg.body else f"[{msg.msg_type}]"
            history.append({"role": role, "content": body})

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


    # Engine resolution  (priority: Flow > AI)
    # ------------------------------------------------------------------
    def _resolve_engine(self):
        """Return (engine_instance, label) or (None, None)."""
        #  Flow engine
        flow_engine = self._try_flow_engine()
        if flow_engine:
            return flow_engine, "flow"

        #  AI engine
        ai_engine = self._try_ai_engine()
        if ai_engine:
            return ai_engine, "ai"

        return None, None


    def _try_flow_engine(self):
        try:
            from apps.ai.models import FlowBot, ConversationFlowState
            from apps.ai.chatbot.flow_engine import FlowEngine

        
            flow = FlowBot.objects.filter(
                instance=self.conv.instance,
                is_active=True,
            ).first()

            if not flow:
                return None

            # Don't run the flow engine if it already completed for this conversation
            completed = ConversationFlowState.objects.filter(
                conversation_id=self.conv.id,
                flow=flow,
                is_complete=True,
            ).exists()
            if completed:
                return None

            return FlowEngine(flow)

        except Exception as exc:
            logger.debug(f"[Dispatcher] Flow engine check skipped: {exc}")
            return None


    def _try_ai_engine(self):
        try:
            from apps.ai.models import AIAgentSettings
            from apps.ai.chatbot.ai_engine import AIEngine

            settings = AIAgentSettings.objects.filter(is_active=True).first()

            if not settings:
                logger.debug("[Dispatcher] No active AIAgentSettings found.")
                return None

            if not settings.provider:
                logger.debug("[Dispatcher] AIAgentSettings has no provider.")
                return None

            if not settings.provider.ai_provider_api_key:
                logger.warning("[Dispatcher] Provider API key is missing.")
                return None

            return AIEngine(settings)

        except Exception as exc:
            logger.exception(f"[Dispatcher] AI engine check failed: {exc}")
            return None


    # Persistence & broadcast
    # ------------------------------------------------------------------
    def _persist_and_broadcast(self, reply: ChatbotReply):
        """Send each part of the reply to WhatsApp and save to the DB."""
        for part in reply.messages:
            wa_message_id = ""
            msg_status = "failed"

            if self.conv.instance and self.conv.instance.is_active:
                try:
                    wa_resp = send_whatsapp_message(
                        phone_number_id=self.conv.instance.phone_number_id,
                        access_token=self.conv.instance.access_token,
                        to_phone=self.conv.contact.wa_id,
                        message_text=part["body"],
                        msg_type=part["msg_type"],
                        media_url=part.get("media_url", ""),
                    )
                    if wa_resp.get("messages"):
                        wa_message_id = wa_resp["messages"][0]["id"]
                        msg_status = "sent"
                except Exception as exc:
                    logger.error(f"[Dispatcher] WhatsApp send failed: {exc}")

            msg = Message.objects.create(
                conversation=self.conv,
                direction="outbound",
                msg_type=part["msg_type"],
                body=part["body"],
                media_url=part.get("media_url", ""),
                sent_by=None,    
                status=msg_status,
                wa_message_id=wa_message_id,
                timestamp=timezone.now(),
            )

            self.conv.last_message_at = msg.timestamp
            self.conv.save(update_fields=["last_message_at"])

            broadcast_new_message(self.conv, msg)
        broadcast_conversation_update(self.conv)


    def _check_handoff_after_flow(self):
        """
        If the flow engine completed with a handoff node,
        disable AI for this conversation so a human can take over.
        """
        try:
            from apps.ai.models import ConversationFlowState
            state = ConversationFlowState.objects.filter(
                conversation_id=self.conv.id,
                is_complete=True,
            ).first()
            if state:
                self.conv.ai_active = False
                self.conv.save(update_fields=["ai_active"])
                broadcast_conversation_update(self.conv)
                logger.info(f"[Dispatcher] Conv {self.conv.id}: handoff triggered, ai_active=False.")
        except Exception:
            pass
