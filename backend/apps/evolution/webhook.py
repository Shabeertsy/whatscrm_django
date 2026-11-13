import base64
import logging
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from apps.whatsapp.models import WhatsappInstance
from apps.messaging.models import Contact, Conversation, Message
from apps.messaging.utils import (
    broadcast_new_message,
    broadcast_conversation_update,
    broadcast_message_status_update,
)

logger = logging.getLogger(__name__)


class EvolutionWebhookView(APIView):
    """
    Dedicated Webhook endpoint exclusively for Evolution API (Scanned Physical Devices).
    Receives JSON events: messages.upsert, connection.update, qrcode.updated, messages.update.
    Completely isolated from /api/messaging/webhook/ (Meta Cloud API).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, instance_name=None):
        payload = request.data
        if not isinstance(payload, dict):
            return Response({"status": "invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

        event = str(payload.get("event") or "").lower()
        data = payload.get("data") or {}
        inst_name = (
            instance_name
            or payload.get("instance")
            or (data.get("instance") if isinstance(data, dict) else None)
        )

        logger.debug(f"[Evolution Webhook] Received event '{event}' for instance '{inst_name}'")

        # Resolve instance
        instance = None
        if inst_name:
            instance = WhatsappInstance.objects.filter(
                evolution_instance_name=inst_name,
                instance_type="scanned_device",
            ).first()

        if not instance and inst_name:
            # Fallback search by display_name or substring
            instance = WhatsappInstance.objects.filter(
                evolution_instance_name__iexact=inst_name,
            ).first()

        if not instance:
            logger.warning(f"[Evolution Webhook] Instance not found for identifier: {inst_name}")
            return Response({"status": "instance_not_found"}, status=status.HTTP_200_OK)

        # Route events
        if event in ["messages.upsert", "messages_upsert"]:
            self._handle_messages_upsert(instance, data)
        elif event in ["connection.update", "connection_update"]:
            self._handle_connection_update(instance, data)
        elif event in ["qrcode.updated", "qrcode_updated"]:
            self._handle_qrcode_updated(instance, data)
        elif event in ["messages.update", "messages_update"]:
            self._handle_messages_update(instance, data)

        return Response({"status": "success"}, status=status.HTTP_200_OK)

    def _handle_messages_upsert(self, instance: WhatsappInstance, data: dict):
        """Processes incoming or outgoing messages from physical WhatsApp web session."""
        key = data.get("key") or {}
        remote_jid = key.get("remoteJid") or ""
        
        # Ignore WhatsApp group messages and status broadcasts
        if "@g.us" in remote_jid or "@broadcast" in remote_jid:
            return

        wa_msg_id = key.get("id") or ""
        from_me = key.get("fromMe", False)
        
        # Use remoteJidAlt when remoteJid is a WhatsApp Linked Device ID (@lid)
        remote_jid_resolved = key.get("remoteJidAlt") or remote_jid
        phone_raw = remote_jid_resolved.split("@")[0]
        clean_phone = "".join(c for c in phone_raw if c.isdigit())
        if not clean_phone or len(clean_phone) < 7:
            return

        # Deduplication check
        if wa_msg_id and Message.objects.filter(wa_message_id=wa_msg_id).exists():
            return

        push_name = data.get("pushName") or ""
        message_obj = data.get("message") or {}

        # Parse message content & type
        msg_type, body, media_url = self._extract_message_content(message_obj, data)

        # Find or create Contact
        phone_with_plus = f"+{clean_phone}"
        contact, _ = Contact.objects.get_or_create(
            wa_id=clean_phone,
            defaults={
                "phone": phone_with_plus,
                "name": push_name or phone_with_plus,
                "is_saved": False,
                "source": "whatsapp",
            },
        )
        if push_name and not contact.name:
            contact.name = push_name
            contact.save(update_fields=["name"])

        # Find or create Conversation
        conv, created = Conversation.objects.get_or_create(
            contact=contact,
            instance=instance,
            status__in=["open", "pending"],
            defaults={"status": "open"},
        )
        if not created and conv.status == "resolved":
            conv.status = "open"
            conv.save(update_fields=["status"])

        now_ts = timezone.now()
        direction = "outbound" if from_me else "inbound"
        msg_status = "sent" if from_me else "delivered"

        # Create Message record
        msg = Message.objects.create(
            conversation=conv,
            wa_message_id=wa_msg_id,
            direction=direction,
            msg_type=msg_type,
            body=body,
            media_url=media_url,
            status=msg_status,
            timestamp=now_ts,
        )

        # Update Conversation stats
        conv.last_message_at = now_ts
        if not from_me:
            conv.unread_count = conv.unread_count + 1
        conv.save(update_fields=["last_message_at", "unread_count"])

        # Broadcast live to React Inbox via WebSockets
        broadcast_new_message(conv, msg)
        broadcast_conversation_update(conv)

        # Auto-create pipeline deal on first inbound message if configured
        if not from_me:
            self._maybe_create_pipeline_deal(contact, conv, instance)
            
            # Optionally trigger background processing (Automation / AI)
            if getattr(settings, "CELERY_ENABLED", False):
                try:
                    from apps.messaging.tasks import process_inbound_message
                    process_inbound_message.delay(conv.id)
                except Exception as e:
                    logger.warning(f"[Evolution Webhook] Celery trigger failed: {e}")

    def _extract_message_content(self, message_obj: dict, data: dict):
        """Extracts text, media type, and media url from Evolution API message structure."""
        body = ""
        msg_type = "text"
        media_url = ""

        if "conversation" in message_obj and message_obj["conversation"]:
            body = message_obj["conversation"]
            msg_type = "text"
        elif "extendedTextMessage" in message_obj:
            body = message_obj["extendedTextMessage"].get("text", "")
            msg_type = "text"
        elif "imageMessage" in message_obj:
            img = message_obj["imageMessage"]
            body = img.get("caption", "")
            msg_type = "image"
            media_url = self._save_evolution_media(data.get("base64"), img.get("mimetype", "image/jpeg"), "img")
        elif "audioMessage" in message_obj:
            aud = message_obj["audioMessage"]
            msg_type = "audio"
            media_url = self._save_evolution_media(data.get("base64"), aud.get("mimetype", "audio/ogg"), "aud")
        elif "videoMessage" in message_obj:
            vid = message_obj["videoMessage"]
            body = vid.get("caption", "")
            msg_type = "video"
            media_url = self._save_evolution_media(data.get("base64"), vid.get("mimetype", "video/mp4"), "vid")
        elif "documentMessage" in message_obj:
            doc = message_obj["documentMessage"]
            body = doc.get("fileName") or doc.get("caption", "")
            msg_type = "document"
            media_url = self._save_evolution_media(data.get("base64"), doc.get("mimetype", "application/pdf"), "doc")

        return msg_type, body, media_url

    def _save_evolution_media(self, base64_str: str, mimetype: str, prefix: str) -> str:
        """Saves base64 media to storage if provided."""
        if not base64_str:
            return ""
        try:
            # Clean base64 header if present (e.g. data:image/png;base64,...)
            if "," in base64_str:
                base64_str = base64_str.split(",", 1)[1]
            file_bytes = base64.b64decode(base64_str)
            ext = ".jpg"
            if "png" in mimetype: ext = ".png"
            elif "pdf" in mimetype: ext = ".pdf"
            elif "ogg" in mimetype: ext = ".ogg"
            elif "mp4" in mimetype: ext = ".mp4"

            filename = f"chat_media/{prefix}_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{timezone.now().microsecond}{ext}"
            saved_path = default_storage.save(filename, ContentFile(file_bytes))
            return default_storage.url(saved_path)
        except Exception as exc:
            logger.warning(f"[Evolution Webhook] Failed to decode and save media: {exc}")
            return ""

    def _handle_connection_update(self, instance: WhatsappInstance, data: dict):
        """Updates instance connection status ('open', 'close', 'connecting')."""
        raw_state = data.get("state") or data.get("status") or ""
        state = str(raw_state).lower()
        logger.info(f"[Evolution Webhook] Instance {instance.evolution_instance_name} state updated to: {state}")

        instance.evolution_status = state
        instance.is_active = (state == "open")

        # Extract connected phone number if reported by Evolution
        owner_jid = data.get("owner") or data.get("sender") or ""
        if owner_jid and "@" in str(owner_jid):
            phone_num = str(owner_jid).split("@")[0]
            instance.evolution_phone = f"+{phone_num}"

        if state == "open":
            instance.evolution_qr_code = ""

        instance.save(update_fields=["evolution_status", "is_active", "evolution_phone", "evolution_qr_code", "updated_at"])

    def _handle_qrcode_updated(self, instance: WhatsappInstance, data: dict):
        """Saves fresh QR code for linking."""
        qr_obj = data.get("qrcode") or {}
        base64_code = ""
        if isinstance(qr_obj, dict):
            base64_code = qr_obj.get("base64") or qr_obj.get("code") or ""
        elif isinstance(qr_obj, str):
            base64_code = qr_obj

        if base64_code:
            instance.evolution_qr_code = base64_code
            instance.save(update_fields=["evolution_qr_code"])

    def _handle_messages_update(self, instance: WhatsappInstance, data: list | dict):
        """Updates delivery/read status of sent messages."""
        updates = data if isinstance(data, list) else [data]
        for item in updates:
            key = item.get("key") or {}
            wa_msg_id = key.get("id")
            if not wa_msg_id:
                continue

            update_info = item.get("update") or {}
            raw_status = update_info.get("status") or item.get("status")
            status_map = {
                "DELIVERY_ACK": "delivered",
                "READ": "read",
                "PLAYED": "read",
                "ERROR": "failed",
                2: "delivered",
                3: "read",
                4: "read",
            }
            new_status = status_map.get(raw_status)
            if new_status:
                msg = Message.objects.filter(wa_message_id=wa_msg_id).first()
                if msg and msg.status != new_status:
                    msg.status = new_status
                    msg.save(update_fields=["status"])
                    broadcast_message_status_update(msg.conversation, wa_msg_id, new_status)

    def _maybe_create_pipeline_deal(self, contact, conv, instance):
        """Creates pipeline deal on first message if configured."""
        try:
            from apps.contacts.models import Pipeline, PipelineDeal
            from apps.contacts.utils import increment_pipeline_cache_version
            pipeline = Pipeline.objects.filter(owner=instance.user, is_active=True).first()
            if not pipeline:
                return

            first_stage = pipeline.stages.order_by("order").first()
            if not first_stage:
                return

            deal_exists = PipelineDeal.objects.filter(wa_contact=contact, owner=instance.user).exists()
            if not deal_exists:
                PipelineDeal.objects.create(
                    pipeline=pipeline,
                    stage=first_stage,
                    wa_contact=contact,
                    owner=instance.user,
                    name=contact.name or contact.phone or "New Inquiry",
                    value=0,
                )
                increment_pipeline_cache_version(instance.user_id)
        except Exception as e:
            logger.warning(f"[Evolution Webhook] Failed to auto-create deal: {e}")

