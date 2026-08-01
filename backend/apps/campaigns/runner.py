import logging
import uuid
from typing import Optional

from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from .models import CampaignDelivery



logger = logging.getLogger(__name__)


class CampaignRunError(Exception):
    """Raised when a campaign run encounters a fatal configuration error."""


class CampaignRunner:
    """
    1.  Acquires a DB row-lock to prevent concurrent runs.
    2.  Validates the campaign is in a runnable state.
    3.  Resolves the target contact list.
    4.  Streams contacts in chunks (memory-safe).
    5.  For each contact, checks idempotency (CampaignDelivery) then sends.
    6.  Updates campaign.sent atomically via F() expression.
    7.  Calculates next_run_at based on frequency.
    8.  Marks Completed when there is no future run.
    """

    CHUNK_SIZE = 500 

    def __init__(self, campaign):
        self.campaign = campaign


    # Public entry point
    # ──────────────────────────────
    def run(self) -> dict:
        with transaction.atomic():
            from .models import Campaign
            try:
                campaign = (
                    Campaign.objects
                    .select_for_update(nowait=True)
                    .get(pk=self.campaign.pk)
                )
            except Campaign.DoesNotExist:
                logger.error("[CampaignRunner] Campaign %s no longer exists.", self.campaign.pk)
                return {"sent": 0, "failed": 0, "skipped": 0}
            except Exception:
                logger.warning(
                    "[CampaignRunner] Campaign %s is locked by another worker. Skipping.",
                    self.campaign.pk,
                )
                return {"sent": 0, "failed": 0, "skipped": 0}

            self.campaign = campaign
            self._validate()

        # Resolve contacts 
        contacts_qs = self._resolve_contacts()
        if not contacts_qs.exists():
            logger.warning(
                "[CampaignRunner] Campaign %s has no target contacts. Marking completed.",
                campaign.id,
            )
            self._mark_completed()
            return {"sent": 0, "failed": 0, "skipped": 0}

        # Resolve WhatsApp instance 
        instance = self._resolve_whatsapp_instance()

        # Stable run_id for idempotency 
        run_id = self._get_or_create_run_id()

        logger.info(
            "[CampaignRunner] Starting run for campaign=%s (%s) run_id=%s",
            campaign.id, campaign.name, run_id,
        )

        sent = failed = skipped = 0

        for contact in contacts_qs.iterator(chunk_size=self.CHUNK_SIZE):
            wa_id = contact.wa_id or contact.phone
            if wa_id:
                wa_id = wa_id.replace('+', '').replace(' ', '')
            if not wa_id:
                skipped += 1
                continue

            delivery, created = self._get_or_create_delivery(contact, run_id)

            if not created and delivery.status == "sent":
                # Already sent in a previous attempt of this run_id — skip
                logger.debug(
                    "[CampaignRunner] Contact %s already sent in run %s — skipping.",
                    contact.id, run_id,
                )
                skipped += 1
                continue

            try:
                msg = self._send_template(instance=instance, crm_contact=contact, to_phone=wa_id)
                delivery.status = "sent"
                delivery.sent_at = timezone.now()
                delivery.error = ""
                if msg and msg.wa_message_id:
                    delivery.wa_message_id = msg.wa_message_id
                delivery.save(update_fields=["status", "sent_at", "error", "wa_message_id"])
                sent += 1
            except Exception as exc:
                delivery.status = "failed"
                delivery.error = str(exc)[:500]
                delivery.save(update_fields=["status", "error"])
                failed += 1
                logger.error(
                    "[CampaignRunner] Failed to send to contact %s (wa_id=%s): %s",
                    contact.id, wa_id, exc,
                )

        #  Persist metrics and schedule next run 
        self._finalize(sent=sent)
        logger.info(
            "[CampaignRunner] Finished campaign=%s | sent=%d failed=%d skipped=%d",
            campaign.id, sent, failed, skipped,
        )
        return {"sent": sent, "failed": failed, "skipped": skipped}


    # Private helpers
    # ─────────────────────────────────────────────────────────────
    def _validate(self) -> None:
        """Raise CampaignRunError for unrecoverable config problems."""
        campaign = self.campaign
        if campaign.status != "Running":
            raise CampaignRunError(
                f"Campaign {campaign.id} has status '{campaign.status}' — expected 'Running'."
            )
        if not campaign.template_name:
            raise CampaignRunError(
                f"Campaign {campaign.id} has no template_name configured."
            )

    def _resolve_contacts(self):
        """
        Return a queryset of contacts reachable via WhatsApp.
        """
        from apps.contacts.models import Contact

        reachable = Q(wa_id__isnull=False) & ~Q(wa_id="") | Q(phone__isnull=False) & ~Q(phone="")
        if self.campaign.target_type == "specific":
            return self.campaign.contacts.filter(reachable)
        return Contact.objects.filter(owner=self.campaign.owner).filter(reachable)

    def _resolve_whatsapp_instance(self):
        """Return the first active WhatsApp instance for the campaign owner."""
        from apps.whatsapp.models import WhatsappInstance

        instance = WhatsappInstance.objects.filter(
            is_active=True
        ).order_by('-created_at').first()

        if not instance:
            raise CampaignRunError("No active WhatsApp instance found.")

        logger.info(
            "[CampaignRunner] Using instance %s (phone_number_id=%s) for campaign %s",
            instance.id, instance.phone_number_id, self.campaign.id,
        )
        return instance

    def _get_or_create_run_id(self) -> str:
        """
        Returns a stable run_id for this recurrence cycle.
        We use the campaign's last_run_at ISO timestamp if available
        (so subsequent calls within the same cycle share the same run_id),
        otherwise generate a new one and persist it immediately.
        """
        campaign = self.campaign
        if campaign.last_run_at:
            return campaign.last_run_at.strftime("%Y%m%dT%H%M%SZ")

        # First-ever run: generate and persist the run start time
        now = timezone.now()
        campaign.last_run_at = now
        campaign.save(update_fields=["last_run_at"])
        return now.strftime("%Y%m%dT%H%M%SZ")

    def _get_or_create_delivery(self, contact, run_id):
        return CampaignDelivery.objects.get_or_create(
            campaign=self.campaign,
            contact=contact,
            run_id=run_id,
        )

    def _send_template(self, instance, crm_contact, to_phone: str):
        from apps.messaging.utils import send_and_save_message
        from apps.whatsapp.models import WhatsappTemplate
        from apps.messaging.models import Contact as MsgContact, Conversation

        template_name = self.campaign.template_name
        template_language = "en"  # Default

        template_obj = WhatsappTemplate.objects.filter(
            name=template_name,
            instance=instance
        ).first()
        
        if not template_obj:
            template_obj = WhatsappTemplate.objects.filter(
                name=template_name,
                instance__user=self.campaign.owner
            ).first()

        if template_obj and template_obj.language:
            template_language = template_obj.language

        # Resolve messaging Contact
        msg_contact = getattr(crm_contact, 'wa_contact', None)
        if not msg_contact:
            msg_contact, created = MsgContact.objects.get_or_create(
                wa_id=to_phone,
                defaults={'phone': to_phone, 'name': crm_contact.name, 'crm_contact': crm_contact}
            )
            if not created and not msg_contact.crm_contact:
                msg_contact.crm_contact = crm_contact
                msg_contact.save(update_fields=['crm_contact'])

        # Resolve Conversation
        conv = Conversation.objects.filter(contact=msg_contact, instance=instance).order_by('-last_message_at').first()
        if not conv:
            conv = Conversation.objects.create(contact=msg_contact, instance=instance, status='open')
        elif conv.status == 'resolved':
            conv.status = 'open'
            conv.save(update_fields=['status'])

        # Extract actual template text if available
        category = template_obj.template_type if template_obj else "TEMPLATE"
        msg_body = f"[Template: {category}]"
        
        if template_obj and template_obj.components:
            for comp in template_obj.components:
                if isinstance(comp, dict) and comp.get("type") == "BODY":
                    text = comp.get("text")
                    if text:
                        msg_body = f"[Template: {category}]\n{text}"
                    break

        return send_and_save_message(
            conversation=conv,
            msg_type="template",
            body=msg_body,
            template_name=template_name,
            template_language=template_language,
            sent_by=self.campaign.owner,
        )

    def _finalize(self, sent: int) -> None:
        """
        Atomically update campaign metrics and schedule the next run.
        Uses F() for the sent counter to avoid lost-update race conditions.
        Refreshes from DB before writing to avoid overwriting concurrent changes.
        """
        with transaction.atomic():
            from .models import Campaign

            # Re-fetch with a lock to get the freshest state
            campaign = Campaign.objects.select_for_update().get(pk=self.campaign.pk)
            now = timezone.now()

            next_run = self._calculate_next_run(now)
            campaign.sent = F("sent") + sent   
            campaign.last_run_at = now
            campaign.next_run_at = next_run

            if next_run is None:
                campaign.status = "Completed"
            campaign.save(update_fields=["sent", "last_run_at", "next_run_at", "status"])

    def _mark_completed(self) -> None:
        self.campaign.status = "Completed"
        self.campaign.next_run_at = None
        self.campaign.save(update_fields=["status", "next_run_at"])

    def _calculate_next_run(self, from_dt) -> Optional[object]:
        """
        Return the next run datetime, or None if the campaign should not recur.
        Uses dateutil.relativedelta for calendar-accurate monthly intervals.
        """
        campaign = self.campaign
        freq = campaign.frequency

        if freq == "once":
            return None

        if freq == "daily":
            next_run = from_dt + relativedelta(days=1)
        elif freq == "weekly":
            next_run = from_dt + relativedelta(weeks=1)
        elif freq == "monthly":
            next_run = from_dt + relativedelta(months=1)
        elif freq == "custom":
            days = max(campaign.custom_days_gap or 1, 1)
            next_run = from_dt + relativedelta(days=days)
        else:
            return None

        if campaign.end_date and next_run > campaign.end_date:
            return None

        return next_run
