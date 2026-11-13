import re
import uuid
import logging
from django.conf import settings
from django.utils.text import slugify

from apps.whatsapp.models import WhatsappInstance
from .client import EvolutionClient, EvolutionAPIError

logger = logging.getLogger(__name__)


def generate_unique_instance_name(display_name: str) -> str:
    """Generates an alphanumeric slug suitable for Evolution API container routing."""
    base_slug = slugify(display_name or "phone")
    base_slug = re.sub(r'[^a-zA-Z0-9_-]', '', base_slug)[:20] or "device"
    unique_suffix = uuid.uuid4().hex[:6]
    return f"{base_slug}-{unique_suffix}"


def create_scanned_instance(user, display_name: str) -> WhatsappInstance:
    """
    Sets up a new Scanned Physical Device instance:
    1. Persists a WhatsappInstance model with instance_type='scanned_device'
    2. Calls Evolution API to create the instance
    3. Configures the isolated Evolution webhook
    4. Fetches and saves the initial QR code
    """
    client = EvolutionClient()
    instance_name = generate_unique_instance_name(display_name)

    # Create database record
    instance = WhatsappInstance.objects.create(
        user=user,
        display_name=display_name.strip() or f"Scanned Device ({instance_name})",
        instance_type="scanned_device",
        evolution_instance_name=instance_name,
        evolution_status="connecting",
        is_active=True,
    )

    try:
        #  Call Evolution API to create instance
        client.create_instance(instance_name=instance_name, qrcode=True)

        # Configure Evolution webhook
        base_url = (
            getattr(settings, "EVOLUTION_WEBHOOK_BASE_URL", None)
            or getattr(settings, "BACKEND_PUBLIC_URL", "http://localhost:8000")
        ).rstrip("/")
        webhook_url = f"{base_url}/api/evolution/webhook/{instance_name}/"
        client.set_webhook(instance_name=instance_name, webhook_url=webhook_url)

        # Fetch initial QR code
        qr_data = client.connect_instance(instance_name=instance_name)
        qr_code = _extract_qr_code(qr_data)
        if qr_code:
            instance.evolution_qr_code = qr_code
            instance.save(update_fields=["evolution_qr_code"])

    except Exception as exc:
        logger.exception(f"[Evolution Service] Failed during instance setup for {instance_name}: {exc}")
        instance.evolution_status = "disconnected"
        instance.save(update_fields=["evolution_status"])

    return instance


def get_instance_qr(instance: WhatsappInstance) -> str:
    """Fetches the latest active QR code string/base64 from Evolution API."""
    if instance.instance_type != "scanned_device":
        raise ValueError("Cannot fetch QR code for non-scanned device instance.")

    client = EvolutionClient()
    qr_data = client.connect_instance(instance_name=instance.evolution_instance_name)
    qr_code = _extract_qr_code(qr_data)
    if qr_code:
        instance.evolution_qr_code = qr_code
        instance.save(update_fields=["evolution_qr_code"])
    return qr_code or instance.evolution_qr_code


def sync_instance_status(instance: WhatsappInstance) -> str:
    """Queries Evolution API connectionState and updates the database record."""
    if instance.instance_type != "scanned_device":
        return "open" if instance.is_active else "close"

    client = EvolutionClient()
    try:
        state_data = client.get_connection_state(instance.evolution_instance_name)
        # Parse state: { "instance": { "state": "open" | "close" | "connecting" } }
        inst_data = state_data.get("instance", {})
        raw_state = inst_data.get("state") or state_data.get("state") or "disconnected"
        status_normalized = str(raw_state).lower()

        instance.evolution_status = status_normalized
        instance.is_active = (status_normalized == "open")
        
        # If QR code was consumed and connection is open, clear QR
        if status_normalized == "open" and instance.evolution_qr_code:
            instance.evolution_qr_code = ""

        instance.save(update_fields=["evolution_status", "is_active", "evolution_qr_code", "updated_at"])

        # Auto-sync existing chats if instance has 0 conversations
        if status_normalized == "open":
            from apps.messaging.models import Conversation
            if Conversation.objects.filter(instance=instance).count() == 0:
                try:
                    sync_scanned_instance_chats(instance)
                except Exception as sync_err:
                    logger.warning(f"[Evolution Service] Auto-sync chats error: {sync_err}")

        return status_normalized
    except Exception as exc:
        logger.warning(f"[Evolution Service] Could not fetch connectionState for {instance.evolution_instance_name}: {exc}")
        return instance.evolution_status


def disconnect_scanned_instance(instance: WhatsappInstance) -> bool:
    """Disconnects / logs out physical phone session."""
    if instance.instance_type != "scanned_device":
        return False

    client = EvolutionClient()
    try:
        client.logout_instance(instance.evolution_instance_name)
    except Exception as exc:
        logger.warning(f"[Evolution Service] Error during logout: {exc}")

    instance.evolution_status = "disconnected"
    instance.evolution_qr_code = ""
    instance.is_active = False
    instance.save(update_fields=["evolution_status", "evolution_qr_code", "is_active", "updated_at"])
    return True


def delete_scanned_instance(instance: WhatsappInstance) -> bool:
    """Deletes instance from Evolution API and deactivates local record."""
    if instance.instance_type != "scanned_device":
        return False

    client = EvolutionClient()
    try:
        client.delete_instance(instance.evolution_instance_name)
    except Exception as exc:
        logger.warning(f"[Evolution Service] Error deleting Evolution instance: {exc}")
    return True


def send_evolution_message(
    instance: WhatsappInstance,
    to_phone: str,
    message_text: str = "",
    msg_type: str = "text",
    media_url: str = "",
    reply_to_wa_id: str = "",
    filename: str = "",
) -> dict:
    """
    Dispatches outgoing message through Evolution API.
    Returns response formatted as {'messages': [{'id': wa_message_id}]}
    for seamless compatibility with the existing send_and_save_message pipeline.
    """
    client = EvolutionClient()
    instance_name = instance.evolution_instance_name

    logger.info(
        f"[Evolution Outbound] Sending {msg_type} to {to_phone} via instance {instance_name}"
    )

    if msg_type == "text":
        resp = client.send_text_message(
            instance_name=instance_name,
            to_phone=to_phone,
            text=message_text,
            quoted_id=reply_to_wa_id,
        )
    else:
        # Standardize media_type: image, audio, video, document
        m_type = msg_type if msg_type in ["image", "video", "audio", "document"] else "document"
        resp = client.send_media_message(
            instance_name=instance_name,
            to_phone=to_phone,
            media_url=media_url,
            media_type=m_type,
            caption=message_text,
            filename=filename,
        )

    # Extract Evolution message ID:
    wa_id = (
        resp.get("key", {}).get("id")
        or resp.get("id")
        or resp.get("messageId")
        or f"evo_{uuid.uuid4().hex[:16]}"
    )

    return {"messages": [{"id": wa_id}]}


def _extract_qr_code(qr_data: dict) -> str:
    """Extracts base64 QR data or code from Evolution connect response."""
    if not isinstance(qr_data, dict):
        return ""
    if "base64" in qr_data and qr_data["base64"]:
        return qr_data["base64"]
    if "qrcode" in qr_data and isinstance(qr_data["qrcode"], dict):
        return qr_data["qrcode"].get("base64") or qr_data["qrcode"].get("code", "")
    if "code" in qr_data:
        return qr_data["code"]
    return ""


def sync_scanned_instance_chats(instance: WhatsappInstance) -> int:
    """
    Imports all existing chats and messages from Evolution API into Django's
    Contact, Conversation, and Message tables.
    """
    if instance.instance_type != "scanned_device":
        return 0

    client = EvolutionClient()
    inst_name = instance.evolution_instance_name

    # 1. Fetch contacts from Evolution API to build a name map
    contact_name_map = {}
    try:
        raw_contacts = client.find_contacts(inst_name)
        for c in raw_contacts:
            r_jid = c.get("remoteJid") or ""
            if "@s.whatsapp.net" in r_jid:
                num = "".join(ch for ch in r_jid.split("@")[0] if ch.isdigit())
                if num and c.get("pushName"):
                    contact_name_map[num] = c["pushName"]
    except Exception as exc:
        logger.warning(f"[Evolution Sync] Could not fetch contacts for {inst_name}: {exc}")

    # 2. Fetch messages from Evolution API
    try:
        records = client.find_messages(inst_name)
    except Exception as exc:
        logger.warning(f"[Evolution Sync] Could not fetch messages for {inst_name}: {exc}")
        return 0

    imported_count = 0
    from apps.messaging.models import Contact, Conversation, Message
    from datetime import datetime, timezone as dt_tz

    for r in reversed(records):
        k = r.get("key") or {}
        remote_jid = k.get("remoteJidAlt") or k.get("remoteJid") or ""
        if "@g.us" in remote_jid or "@broadcast" in remote_jid:
            continue
        phone_raw = remote_jid.split("@")[0]
        clean_phone = "".join(ch for ch in phone_raw if ch.isdigit())
        if not clean_phone or len(clean_phone) < 7:
            continue

        phone_with_plus = f"+{clean_phone}"
        push_name = r.get("pushName") or contact_name_map.get(clean_phone) or phone_with_plus

        contact, _ = Contact.objects.get_or_create(
            wa_id=clean_phone,
            defaults={
                "phone": phone_with_plus,
                "name": push_name,
                "source": "whatsapp",
            }
        )
        if push_name and (not contact.name or contact.name == phone_with_plus):
            contact.name = push_name
            contact.save(update_fields=["name"])

        conv, _ = Conversation.objects.get_or_create(
            contact=contact,
            instance=instance,
            defaults={"status": "open"}
        )

        wa_msg_id = k.get("id") or r.get("id")
        if wa_msg_id and Message.objects.filter(wa_message_id=wa_msg_id).exists():
            continue

        m = r.get("message") or {}
        body = m.get("conversation") or m.get("extendedTextMessage", {}).get("text") or ""
        if not body:
            if "imageMessage" in m:
                body = m["imageMessage"].get("caption") or "[Image]"
            elif "audioMessage" in m:
                body = "[Voice Note]"
            elif "videoMessage" in m:
                body = "[Video]"
            elif "documentMessage" in m:
                body = m["documentMessage"].get("fileName") or "[Document]"
            elif "interactiveMessage" in m:
                body = m["interactiveMessage"].get("body", {}).get("text") or "[Interactive Message]"

        ts_val = r.get("messageTimestamp") or 0
        ts = datetime.fromtimestamp(ts_val, tz=dt_tz.utc)
        from_me = k.get("fromMe", False)

        Message.objects.create(
            conversation=conv,
            wa_message_id=wa_msg_id or "",
            direction="outbound" if from_me else "inbound",
            msg_type="text",
            body=body,
            status="sent" if from_me else "delivered",
            timestamp=ts,
        )
        imported_count += 1

        if not conv.last_message_at or ts > conv.last_message_at:
            conv.last_message_at = ts
            conv.save(update_fields=["last_message_at"])

    # 3. Ensure webhook is configured
    try:
        base_url = (
            getattr(settings, "EVOLUTION_WEBHOOK_BASE_URL", None)
            or getattr(settings, "BACKEND_PUBLIC_URL", "http://localhost:8000")
        ).rstrip("/")
        webhook_url = f"{base_url}/api/evolution/webhook/{inst_name}/"
        client.set_webhook(inst_name, webhook_url)
    except Exception as exc:
        logger.warning(f"[Evolution Sync] Could not ensure webhook for {inst_name}: {exc}")

    logger.info(f"[Evolution Sync] Imported {imported_count} messages for {inst_name}")
    return imported_count

