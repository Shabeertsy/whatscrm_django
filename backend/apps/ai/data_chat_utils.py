import json
import logging
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)



# Data Gathering Functions
# -----------------------------------------
def gather_contacts_context(owner) -> dict:
    """
    Returns a summary of CRM contacts owned by the tenant.
    Caps at 200 records to keep the context size manageable.
    """
    try:
        from apps.contacts.models import Contact
        contacts_qs = Contact.objects.filter(owner=owner).select_related().prefetch_related('tags')[:200]

        contacts_list = []
        for c in contacts_qs:
            contacts_list.append({
                "id": str(c.id),
                "name": c.name,
                "phone": c.phone,
                "email": c.email or None,
                "status": c.status,
                "tags": [t.name for t in c.tags.all()],
                "notes": c.notes[:100] if c.notes else None,
                "created_at": c.created_at.strftime("%Y-%m-%d") if hasattr(c, 'created_at') else None,
            })

        total_count = Contact.objects.filter(owner=owner).count()
        active_count = Contact.objects.filter(owner=owner, status='Active').count()
        inactive_count = total_count - active_count

        return {
            "total": total_count,
            "active": active_count,
            "inactive": inactive_count,
            "sample_limit": 200,
            "contacts": contacts_list,
        }
    except Exception as e:
        logger.error(f"[DataChat] gather_contacts_context error: {e}")
        return {"error": str(e), "contacts": []}


def gather_pipeline_context(owner) -> dict:
    """
    Returns all pipelines, their stages, and deals .
    """
    try:
        from apps.contacts.models import Pipeline, PipelineDeal
        pipelines_qs = Pipeline.objects.filter(owner=owner).prefetch_related('stages', 'deals')

        pipelines_data = []
        for pipeline in pipelines_qs:
            stages_data = []
            for stage in pipeline.stages.order_by('order'):
                deals_in_stage = PipelineDeal.objects.filter(stage=stage, owner=owner).select_related('wa_contact')
                deals_list = []
                for deal in deals_in_stage:
                    deals_list.append({
                        "id": str(deal.id),
                        "name": deal.name,
                        "value": float(deal.value),
                        "contact": deal.wa_contact.name if deal.wa_contact else None,
                        "contact_phone": deal.wa_contact.phone if deal.wa_contact else None,
                        "note": deal.note[:150] if deal.note else None,
                        "created_at": deal.created_at.strftime("%Y-%m-%d") if hasattr(deal, 'created_at') else None,
                    })
                stages_data.append({
                    "stage_id": str(stage.id),
                    "title": stage.title,
                    "order": stage.order,
                    "deals_count": len(deals_list),
                    "total_value": sum(d["value"] for d in deals_list),
                    "deals": deals_list,
                })

            total_deals = sum(s["deals_count"] for s in stages_data)
            total_value = sum(s["total_value"] for s in stages_data)

            pipelines_data.append({
                "id": str(pipeline.id),
                "name": pipeline.name,
                "is_active": pipeline.is_active,
                "total_deals": total_deals,
                "total_value": total_value,
                "stages": stages_data,
            })

        return {
            "pipelines_count": len(pipelines_data),
            "pipelines": pipelines_data,
        }
    except Exception as e:
        logger.error(f"[DataChat] gather_pipeline_context error: {e}")
        return {"error": str(e), "pipelines": []}


def gather_chats_context(owner) -> dict:
    """
    Returns the last 100 conversations
    """
    try:
        from apps.messaging.models import Conversation, Contact as WAContact
        from apps.whatsapp.models import WhatsappInstance

        # Get WA instances belonging to owner
        instances = WhatsappInstance.objects.filter(user=owner)
        conversations_qs = (
            Conversation.objects
            .filter(instance__in=instances)
            .select_related('contact', 'assigned_agent')
            .prefetch_related('messages')
            .order_by('-last_message_at')[:100]
        )

        open_count = 0
        resolved_count = 0
        pending_count = 0

        convos_list = []
        for conv in conversations_qs:
            if conv.status == 'open':
                open_count += 1
            elif conv.status == 'resolved':
                resolved_count += 1
            elif conv.status == 'pending':
                pending_count += 1

            last_msg = conv.messages.order_by('-timestamp').first()
            convos_list.append({
                "id": str(conv.id),
                "contact_name": conv.contact.name or conv.contact.phone,
                "contact_phone": conv.contact.phone,
                "status": conv.status,
                "ai_active": conv.ai_active,
                "unread_count": conv.unread_count,
                "assigned_agent": conv.assigned_agent.get_full_name() if conv.assigned_agent else None,
                "last_message": last_msg.body[:120] if last_msg and last_msg.body else None,
                "last_message_direction": last_msg.direction if last_msg else None,
                "last_message_at": conv.last_message_at.strftime("%Y-%m-%d %H:%M") if conv.last_message_at else None,
            })

        total_count = Conversation.objects.filter(instance__in=instances).count()

        return {
            "total": total_count,
            "open": open_count,
            "resolved": resolved_count,
            "pending": pending_count,
            "sample_limit": 100,
            "conversations": convos_list,
        }
    except Exception as e:
        logger.error(f"[DataChat] gather_chats_context error: {e}")
        return {"error": str(e), "conversations": []}


def gather_metrics_context(owner) -> dict:
    """
    Contact counts, pipeline deal totals, conversation stats,
    recent activity (last 7 days / 30 days)
    """
    try:
        from apps.contacts.models import Contact, PipelineDeal, Pipeline
        from apps.messaging.models import Conversation, Message
        from apps.whatsapp.models import WhatsappInstance

        now = timezone.now()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        instances = WhatsappInstance.objects.filter(user=owner)

        # Contacts
        total_contacts = Contact.objects.filter(owner=owner).count()
        new_contacts_7d = Contact.objects.filter(owner=owner, created_at__gte=last_7_days).count()
        new_contacts_30d = Contact.objects.filter(owner=owner, created_at__gte=last_30_days).count()

        # Deals
        total_deals = PipelineDeal.objects.filter(owner=owner).count()
        total_pipeline_value = sum(
            float(d) for d in PipelineDeal.objects.filter(owner=owner).values_list('value', flat=True)
        )
        new_deals_7d = PipelineDeal.objects.filter(owner=owner, created_at__gte=last_7_days).count()

        # Conversations
        total_convos = Conversation.objects.filter(instance__in=instances).count()
        open_convos = Conversation.objects.filter(instance__in=instances, status='open').count()
        resolved_convos = Conversation.objects.filter(instance__in=instances, status='resolved').count()

        # Messages
        total_messages_7d = Message.objects.filter(
            conversation__instance__in=instances,
            timestamp__gte=last_7_days
        ).count()
        inbound_7d = Message.objects.filter(
            conversation__instance__in=instances,
            timestamp__gte=last_7_days,
            direction='inbound'
        ).count()
        outbound_7d = total_messages_7d - inbound_7d

        # Pipelines
        active_pipeline = Pipeline.objects.filter(owner=owner, is_active=True).first()

        return {
            "contacts": {
                "total": total_contacts,
                "new_last_7_days": new_contacts_7d,
                "new_last_30_days": new_contacts_30d,
            },
            "pipeline": {
                "total_deals": total_deals,
                "total_value": round(total_pipeline_value, 2),
                "new_deals_last_7_days": new_deals_7d,
                "active_pipeline_name": active_pipeline.name if active_pipeline else None,
            },
            "conversations": {
                "total": total_convos,
                "open": open_convos,
                "resolved": resolved_convos,
            },
            "messages_last_7_days": {
                "total": total_messages_7d,
                "inbound": inbound_7d,
                "outbound": outbound_7d,
            },
        }
    except Exception as e:
        logger.error(f"[DataChat] gather_metrics_context error: {e}")
        return {"error": str(e)}


# Main Prompt Builder
# ------------------------------
DATA_CHAT_SYSTEM_PROMPT_TEMPLATE = """\
You are an intelligent business data analyst assistant for this WhatsApp CRM platform.
You have access to the following LIVE business data in JSON format.

Use this data to answer the user's questions accurately and concisely.
When asked about contacts, pipeline deals, conversations, or metrics — always refer to the data provided.
Be friendly, analytical, and clear. Format all currency values in Indian Rupees (INR) using the ₹ symbol (do not use $). Format numbers, totals, and lists neatly.
If the user asks something not covered by the data, say so honestly.

Today's date: {today}

--- LIVE BUSINESS DATA ---
{json_data}
--- END DATA ---
"""


def build_data_context_prompt(owner) -> str:
    """
    Gathers all tenant data, serializes to JSON, and injects into the system prompt.
    """
    today = timezone.now().strftime("%Y-%m-%d %H:%M UTC")
    data = {
        "metrics": gather_metrics_context(owner),
        "contacts": gather_contacts_context(owner),
        "pipeline": gather_pipeline_context(owner),
        "chats": gather_chats_context(owner),
    }

    json_data = json.dumps(data, indent=2, default=str)

    # Trim to ~80k chars to stay safe with token limits
    if len(json_data) > 80000:
        json_data = json_data[:80000] + "\n... [data truncated for length]"
    return DATA_CHAT_SYSTEM_PROMPT_TEMPLATE.format(today=today, json_data=json_data)
