import logging
from celery import shared_task
from apps.messaging.models import Conversation
from apps.ai.models import AIAgentSettings
from apps.ai.chatbot.dispatcher import ChatbotDispatcher


logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=15,
    name="ai.handle_inbound_message",
)

def handle_inbound_message(self, conversation_id: int):
    """
    1. Re-check that AI is still active (agent may have toggled it off).
    2. Honour the `auto_reply_delay` setting (lets the agent see the message first).
    3. Delegate entirely to ChatbotDispatcher.
    """
    try:
       
        # Re-fetch in case state changed while task was queued
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            logger.info(f"[Task] Conversation {conversation_id} no longer exists.")
            return

        if not conv.ai_active:
            logger.info(f"[Task] Conv {conversation_id}: ai_active is False, skipping.")
            return

        ## response delay
        agent = AIAgentSettings.objects.filter(is_active=True).first()
        if agent and agent.auto_reply_delay:
            import time
            time.sleep(agent.auto_reply_delay)

        # Re-check after sleep — human agent might have taken over
        conv.refresh_from_db()
        if not conv.ai_active:
            logger.info(f"[Task] Conv {conversation_id}: ai_active toggled off during delay.")
            return

        dispatcher = ChatbotDispatcher(conv)
        sent = dispatcher.dispatch()
        logger.info(f"[Task] Conv {conversation_id}: dispatch result sent={sent}")

    except Exception as exc:
        logger.exception(f"[Task] Unhandled error for conv {conversation_id}: {exc}")
        raise self.retry(exc=exc)
