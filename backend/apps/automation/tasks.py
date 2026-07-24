import logging
from celery import shared_task

from apps.messaging.models import Conversation
from apps.automation.models import FlowExecution, ExecutionStatus
from apps.ai.chatbot.dispatcher import ChatbotDispatcher
from apps.automation.engine import AutomationEngine


logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=15,
    name="automation.resume_flow_execution",
)
def resume_flow_execution(self, execution_id: int, conversation_id: int):
    """
    Resumes a waiting flow execution after a delay node.
    """
    try:


        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            logger.info(f"[Task] Conversation {conversation_id} no longer exists.")
            return

        try:
            execution = FlowExecution.objects.get(id=execution_id)
        except FlowExecution.DoesNotExist:
            logger.info(f"[Task] FlowExecution {execution_id} no longer exists.")
            return

        if execution.status != ExecutionStatus.WAITING:
            logger.info(f"[Task] FlowExecution {execution_id} is not WAITING, skipping resume.")
            return

        dispatcher = ChatbotDispatcher(conv)
        ctx = dispatcher._build_context()
        if not ctx:
            return

        auto_engine = AutomationEngine(conv)
        reply = auto_engine.resume_wait_execution(execution, ctx)
        
        if reply and not reply.is_empty:
            dispatcher._persist_and_broadcast(reply)
            logger.info(f"[Task] Conv {conversation_id}: Handled by AutomationEngine via delayed resume.")

    except Exception as exc:
        logger.exception(f"[Task] Unhandled error resuming execution {execution_id}: {exc}")
        raise self.retry(exc=exc)
