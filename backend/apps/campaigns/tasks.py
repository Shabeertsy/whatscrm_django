import logging

from celery import shared_task
from django.db.models import Q
from django.utils import timezone

from .models import Campaign
from .runner import CampaignRunner, CampaignRunError

logger = logging.getLogger(__name__)


# Task 1 — Execute a single campaign run
# ─────────────────────────────────────────────────────────────
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,       # 1 minute between retries
    name="campaigns.execute_campaign_run",
)
def execute_campaign_run(self, campaign_id: str):

    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.error("[execute_campaign_run] Campaign %s not found.", campaign_id)
        return

    try:
        result = CampaignRunner(campaign).run()
        logger.info("[execute_campaign_run] campaign=%s result=%s", campaign_id, result)
        return result
    except CampaignRunError as exc:
        logger.error("[execute_campaign_run] Fatal config error for campaign %s: %s", campaign_id, exc)
        campaign.status = "Paused"
        campaign.save(update_fields=["status"])

    except Exception as exc:
        logger.warning(
            "[execute_campaign_run] Transient error for campaign %s (attempt %d): %s",
            campaign_id, self.request.retries + 1, exc,
        )
        raise self.retry(exc=exc)


# Task 2 — Periodic dispatcher (Celery Beat)
# ─────────────────────────────────────────────────────────────
@shared_task(name="campaigns.dispatch_due_campaigns")
def dispatch_due_campaigns():
    """
    A campaign is "due" when:
    - status == 'Running'
    - next_run_at is None (never run) OR next_run_at <= now
    - start_date is None OR start_date <= now
    - end_date is None OR now < end_date
    """

    now = timezone.now()
    due_campaigns = Campaign.objects.filter(
        status="Running",
    ).filter(
        Q(start_date__isnull=True) | Q(start_date__lte=now)
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=now)
    ).filter(
        Q(next_run_at__isnull=True) | Q(next_run_at__lte=now)
    )

    campaign_ids = list(due_campaigns.values_list("id", flat=True))
    logger.info("[dispatch_due_campaigns] Found %d due campaigns: %s", len(campaign_ids), campaign_ids)

    for cid in campaign_ids:
        execute_campaign_run.delay(str(cid))

    return {"dispatched": len(campaign_ids)}
