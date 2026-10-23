import csv
import io
from .models import Contact
from .serializers import ContactSerializer
from apps.core.scoping import scope_by_owner, get_tenant_owner
from django.core.cache import cache



def process_csv_import(csv_file, user):
    """
    Processes a CSV file for importing contacts.
    Returns a tuple (success, data_or_error_message, status_code).
    """
    try:
        content = csv_file.read().decode('utf-8-sig')  
    except UnicodeDecodeError:
        try:
            csv_file.seek(0)
            content = csv_file.read().decode('latin-1')
        except Exception:
            return False, 'Could not decode file. Please use UTF-8 encoding.', 400

    reader = csv.DictReader(io.StringIO(content))

    # Normalize header names (strip whitespace, lowercase)
    if reader.fieldnames is None:
        return False, 'CSV file is empty or has no headers.', 400

    fieldnames_lower = {f.strip().lower(): f for f in reader.fieldnames}

    # Require at least 'name' and 'phone' columns
    name_col = fieldnames_lower.get('name')
    phone_col = fieldnames_lower.get('phone')

    if not name_col or not phone_col:
        return False, 'CSV must contain "name" and "phone" columns.', 400

    email_col = fieldnames_lower.get('email')
    owner = get_tenant_owner(user)

    imported = []
    skipped = []
    errors = []

    for i, row in enumerate(reader, start=2): 
        name = (row.get(name_col) or '').strip()
        phone = (row.get(phone_col) or '').strip()
        email = (row.get(email_col) or '').strip() if email_col else ''

        if not phone:
            errors.append({'row': i, 'reason': 'Missing phone number'})
            continue

        if not name:
            name = phone  

        # Skip if a contact with same phone already exists for this owner
        existing_qs = scope_by_owner(Contact.objects.all(), user)
        if existing_qs.filter(phone=phone).exists():
            skipped.append({'row': i, 'phone': phone, 'reason': 'Already exists'})
            continue

        crm = Contact.objects.create(
            owner=owner,
            name=name,
            phone=phone,
            email=email,
            status='Active',
            source='csv',
        )
        imported.append(ContactSerializer(crm).data)

    return True, {
        'imported': imported,
        'imported_count': len(imported),
        'skipped_count': len(skipped),
        'error_count': len(errors),
        'errors': errors,
    }, 201



def get_pipeline_cache_version(owner_id):
    if not owner_id:
        return 1
    return cache.get(f"pipeline_version_{owner_id}", 1)

def increment_pipeline_cache_version(owner_id):
    if not owner_id:
        return
    cache_key = f"pipeline_version_{owner_id}"
    try:
        cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=None)


def get_first_confirmed_stage(pipeline):
    """
    Returns the first confirmed stage (lowest order) in the given pipeline, if any.
    """
    if not pipeline:
        return None
    from .models import PipelineStage
    return PipelineStage.objects.filter(
        pipeline=pipeline,
        is_confirmed=True
    ).order_by('order').first()


def is_stage_confirmed_or_after(stage):
    """
    Returns True if the given stage is marked as is_confirmed=True.
    """
    if not stage:
        return False
    return bool(stage.is_confirmed)



def sync_deal_confirmation(deal, target_stage=None, owner=None):
    """
    Creates or deletes a ConfirmedBooking record based on whether the deal's
    current/target stage has is_confirmed=True.
    The ConfirmedBooking table is the single source of truth — no snapshot
    fields are written to PipelineDeal.
    """
    from .models import ConfirmedBooking
    from django.utils import timezone

    stage = target_stage or deal.stage
    if not stage or not stage.is_confirmed:
        # Deal is not in a confirmed stage — remove any booking record
        ConfirmedBooking.objects.filter(deal=deal).delete()
        return

    pipeline = stage.pipeline
    now_ts = timezone.now()

    # Resolve contact info
    c_name = (
        deal.wa_contact.crm_contact.name
        if (deal.wa_contact and getattr(deal.wa_contact, 'crm_contact', None))
        else (deal.wa_contact.name if deal.wa_contact else (deal.manual_contact or ''))
    )
    c_phone = (
        deal.wa_contact.crm_contact.phone
        if (deal.wa_contact and getattr(deal.wa_contact, 'crm_contact', None))
        else (deal.wa_contact.phone if deal.wa_contact else '')
    )
    crm_contact = (
        deal.wa_contact.crm_contact
        if (deal.wa_contact and getattr(deal.wa_contact, 'crm_contact', None))
        else None
    )

    tenant_owner = owner or deal.owner

    # Get existing record's confirmed_at so we don't overwrite the original timestamp
    existing = ConfirmedBooking.objects.filter(deal=deal).first()
    confirmed_at = existing.confirmed_at if existing else now_ts

    ConfirmedBooking.objects.update_or_create(
        deal=deal,
        defaults={
            'owner': tenant_owner,
            'contact': crm_contact,
            'pipeline': pipeline,
            'stage': stage,
            'deal_name': deal.name,
            'contact_name': c_name,
            'contact_phone': c_phone,
            'pipeline_name': pipeline.name if pipeline else '',
            'stage_title': stage.title,
            'value': deal.value or 0.00,
            'note': deal.note or '',
            'extra_data': deal.extra_data or {},
            'confirmed_at': confirmed_at,
        }
    )


