import os
import uuid
import json
import logging
from datetime import datetime, timezone

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone as django_tz
from django.core.files.storage import default_storage
from .storage_backends import get_whatsapp_storage

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.whatsapp.models import WhatsappInstance
from .models import Contact, Conversation, Message
from .serializers import (
    ContactSerializer,
    ConversationListSerializer,
    ConversationDetailSerializer,
    ConversationUpdateSerializer,
    MessageSerializer,
    SendMessageSerializer,
)

from .utils import (
    broadcast_new_message, 
    broadcast_delete_message, 
    send_whatsapp_message, 
    broadcast_conversation_update, 
    save_whatsapp_media
)
from .tasks import compress_chat_video

from apps.ai.models import AIAgentSettings

logger = logging.getLogger(__name__)


#  Contact ViewSet 
class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = ContactSerializer

    def get_queryset(self):
        qs = Contact.objects.all()
        is_saved = self.request.query_params.get('is_saved')
        search   = self.request.query_params.get('search')
        if is_saved is not None:
            qs = qs.filter(is_saved=is_saved.lower() == 'true')
        if search:
            qs = qs.filter(
                name__icontains=search
            ) | qs.filter(
                phone__icontains=search
            ) | qs.filter(
                wa_id__icontains=search
            )
        return qs.order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='save')
    def save_contact(self, request, pk=None):
        contact = self.get_object()
        name = request.data.get('name', contact.name)
        tags = request.data.get('tags', contact.tags)
        source = request.data.get('source', 'manual')

        contact.is_saved = True
        contact.name = name
        contact.tags = tags
        contact.source = source
        contact.save(update_fields=['is_saved', 'name', 'tags', 'source', 'updated_at'])
        return Response(ContactSerializer(contact).data)


#  Conversation APIViews
class ConversationListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Conversation.objects.select_related(
            'contact', 'contact__crm_contact', 'instance', 'assigned_agent'
        )

        status_filter = request.query_params.get('status')
        instance_id   = request.query_params.get('instance')
        search        = request.query_params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if instance_id:
            qs = qs.filter(instance_id=instance_id)
        if search:
            qs = qs.filter(contact__name__icontains=search) | \
                 qs.filter(contact__phone__icontains=search)

        qs = qs.order_by('-last_message_at')
        serializer = ConversationListSerializer(qs, many=True)
        return Response(serializer.data)


class ConversationDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        qs = Conversation.objects.select_related(
            'contact', 'contact__crm_contact', 'instance', 'assigned_agent'
        ).prefetch_related(
            'messages',
            'messages__sent_by',
            'messages__replied_to',
            'messages__replied_to__sent_by',
            'messages__replied_to__conversation__contact__crm_contact'
        )
        conv = get_object_or_404(qs, pk=pk)
        serializer = ConversationDetailSerializer(conv)
        return Response(serializer.data)

    def patch(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        serializer = ConversationUpdateSerializer(conv, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ConversationListSerializer(conv).data)


class ConversationSendMessageAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        body = serializer.validated_data.get('body', '')
        msg_type = serializer.validated_data.get('msg_type', 'text')
        media_url = serializer.validated_data.get('media_url', '')
        related_room_uuid = serializer.validated_data.get('related_room_uuid', '')
        template_name = serializer.validated_data.get('template_name', '')
        template_language = serializer.validated_data.get('template_language', 'en')
        
        reply_to_message_id = serializer.validated_data.get('reply_to_message_id')
        replied_to_obj = None
        reply_to_wa_id = ""
        if reply_to_message_id:
            replied_to_obj = Message.objects.filter(id=reply_to_message_id).first()
            if replied_to_obj and replied_to_obj.wa_message_id:
                reply_to_wa_id = replied_to_obj.wa_message_id
                
        storage_path = serializer.validated_data.get('storage_path', '')

        # Process external media URLs (download, convert webp, save locally)
        if media_url and not storage_path:
            from apps.messaging.utils import process_external_media_url
            media_url, storage_path = process_external_media_url(media_url, msg_type, phone=conv.contact.phone)

        filename = ""
        if storage_path:
            filename = os.path.basename(storage_path)
            
        # Meta Graph API Call
        wa_message_id = ""
        msg_status = "failed"
        
        if conv.instance and conv.instance.is_active:
            if msg_type == 'video' and storage_path and getattr(settings, 'CELERY_ENABLED', True):
                # Only queue Celery compression for directly uploaded video files
                msg_status = "pending"
            else:
                try:
                    wa_response = send_whatsapp_message(
                        phone_number_id=conv.instance.phone_number_id,
                        access_token=conv.instance.access_token,
                        to_phone=conv.contact.wa_id,
                        message_text=body,
                        msg_type=msg_type,
                        media_url=media_url,
                        reply_to_wa_id=reply_to_wa_id,
                        filename=filename,
                        storage_path=storage_path,
                        template_name=template_name,
                        template_language=template_language
                    )
                    if 'messages' in wa_response and len(wa_response['messages']) > 0:
                        wa_message_id = wa_response['messages'][0]['id']
                        msg_status = "sent"
                except Exception as e:
                    logger.error(f"Failed to send WhatsApp message: {e}")

        msg = Message.objects.create(
            conversation=conv,
            direction='outbound',
            msg_type=msg_type,
            body=body,
            media_url=media_url,
            storage_path=storage_path,
            related_room_uuid=related_room_uuid if related_room_uuid else None,
            replied_to=replied_to_obj,
            sent_by=request.user,
            status=msg_status,
            wa_message_id=wa_message_id,
            timestamp=django_tz.now(),
        )

        if msg_type == 'video' and msg_status == 'pending' and getattr(settings, 'CELERY_ENABLED', True):
            compress_chat_video.delay(msg.id)

        # Update conversation's last_message_at
        conv.last_message_at = msg.timestamp
        conv.save(update_fields=['last_message_at'])

        # Broadcast to the agent's WebSocket in real-time
        broadcast_new_message(conv, msg)
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class StartConversationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone')
        instance_id = request.data.get('instance_id')
        template_name = request.data.get('template_name', '')
        template_language = request.data.get('template_language', 'en')
        body = request.data.get('body', '')

        name = request.data.get('name', '')
        save_contact = request.data.get('save_contact', False)

        if not phone or not instance_id or not template_name:
            return Response({"error": "Phone, instance_id, and template_name are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Get the instance
        instance = get_object_or_404(WhatsappInstance, id=instance_id)

        # Clean the phone number (remove + if present for WA ID)
        wa_id = phone.replace('+', '').replace(' ', '')
        phone_with_plus = f"+{wa_id}"

        contact, created_contact = Contact.objects.get_or_create(
            wa_id=wa_id,
            defaults={
                'phone': phone_with_plus,
                'is_saved': False,
                'source': 'outbound',
                'name': name if name else '',
            }
        )
        
        # If the user  wants to save
        if save_contact:
            contact.is_saved = True
            if name:
                contact.name = name
            contact.save(update_fields=['is_saved', 'name', 'updated_at'])
            
            # Add to CRM Contacts
            from apps.contacts.models import Contact as CRMContact
            crm_contact, _ = CRMContact.objects.get_or_create(
                phone=phone_with_plus,
                owner=request.user,
                defaults={
                    'name': name or phone_with_plus,
                    'wa_id': wa_id,
                }
            )
            # Link them if not linked
            if not contact.crm_contact:
                contact.crm_contact = crm_contact
                contact.save(update_fields=['crm_contact'])

        # Get or Create Conversation
        conv, created = Conversation.objects.get_or_create(
            contact=contact,
            instance=instance,
            status__in=['open', 'pending'],
            defaults={'status': 'open'}
        )
        if not created and conv.status == 'resolved':
            conv.status = 'open'
            conv.save(update_fields=['status'])

        #  Send the template via Meta Cloud API
        msg_status = "failed"
        wa_message_id = ""
        try:
            wa_response = send_whatsapp_message(
                phone_number_id=instance.phone_number_id,
                access_token=instance.access_token,
                to_phone=wa_id,
                message_text=body,
                msg_type='template',
                template_name=template_name,
                template_language=template_language
            )
            if 'messages' in wa_response and len(wa_response['messages']) > 0:
                wa_message_id = wa_response['messages'][0]['id']
                msg_status = "sent"
        except Exception as e:
            logger.error(f"Failed to send template to new number {wa_id}: {e}")

        # Save Message
        msg = Message.objects.create(
            conversation=conv,
            direction='outbound',
            msg_type='template',
            body=body,
            sent_by=request.user,
            status=msg_status,
            wa_message_id=wa_message_id,
            timestamp=django_tz.now(),
        )

        conv.last_message_at = msg.timestamp
        conv.save(update_fields=['last_message_at'])

        # Broadcast to UI
        if created:
            broadcast_conversation_update(conv)
        broadcast_new_message(conv, msg)

        return Response({
            "conversation": ConversationListSerializer(conv).data,
            "message": MessageSerializer(msg).data
        }, status=status.HTTP_201_CREATED)


class ConversationMarkReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Reset unread_count to 0 when agent opens the conversation."""
        conv = get_object_or_404(Conversation, pk=pk)
        conv.unread_count = 0
        conv.save(update_fields=['unread_count'])
        return Response({'status': 'ok', 'unread_count': 0})


class MediaUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        
        if file_obj.size == 0:
            return Response({"detail": "File cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            
        MAX_SIZE = {
            "image": 16 * 1024 * 1024, 
            "audio": 16 * 1024 * 1024,
            "video": 16 * 1024 * 1024,
            "document": 100 * 1024 * 1024,
        }
        
        # We'll re-check true mime via magic inside utils
        req_type = 'document'
        if file_obj.content_type.startswith('image/'): req_type = 'image'
        elif file_obj.content_type.startswith('audio/'): req_type = 'audio'
        elif file_obj.content_type.startswith('video/'): req_type = 'video'
        
        limit = MAX_SIZE.get(req_type, 16 * 1024 * 1024)
        
        if req_type == 'video' and getattr(settings, 'CELERY_ENABLED', True):
            limit = 200 * 1024 * 1024
            
        if file_obj.size > limit:
            return Response({"detail": f"File size exceeds the {limit // (1024*1024)}MB limit for {req_type}."}, status=status.HTTP_400_BAD_REQUEST)

        ALLOWED_TYPES = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "audio/ogg",
            "audio/webm",
            "audio/mpeg",
            "application/pdf",
        ]
        if file_obj.content_type not in ALLOWED_TYPES:
            return Response({"detail": f"File type {file_obj.content_type} is not supported."}, status=status.HTTP_400_BAD_REQUEST)

        conversation_id = request.data.get('conversation_id')
        phone = None
        
        if conversation_id:
            try:
                conv = Conversation.objects.get(id=conversation_id)
                phone = conv.contact.phone
            except Exception:
                pass
                
        media_data = save_whatsapp_media(file_obj, phone)
        saved_path = media_data["path"]
        mime = media_data["mime"]
        final_size = media_data["size"]
        
        storage = get_whatsapp_storage()
        url = storage.url(saved_path)
        if url.startswith('http://') or url.startswith('https://'):
            file_url = url
        else:
            if getattr(settings, 'BACKEND_PUBLIC_URL', None):
                base_url = settings.BACKEND_PUBLIC_URL.rstrip('/')
                file_url = f"{base_url}{url}"
            else:
                file_url = request.build_absolute_uri(url)
        
        return Response({
            "url": file_url,
            "path": saved_path,
            "filename": file_obj.name,
            "type": mime,
            "size": final_size
        }, status=status.HTTP_201_CREATED)


class MessageDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        msg = get_object_or_404(Message, pk=pk)
        
        # Verify ownership via conversation
        if msg.conversation.instance and msg.conversation.instance.user != request.user:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        conv = msg.conversation
        msg_id_str = str(msg.id)
        
        # Cleanup local media file if it exists
        if msg.storage_path:
            try:
                storage = get_whatsapp_storage()
                if storage.exists(msg.storage_path):
                    storage.delete(msg.storage_path)
            except Exception as e:
                logging.getLogger(__name__).error(f"Failed to delete media file {msg.storage_path}: {str(e)}")

        msg.delete()
        
        # Recalculate last_message_at
        last_msg = conv.messages.order_by('-timestamp').first()
        conv.last_message_at = last_msg.timestamp if last_msg else conv.created_at
        conv.save(update_fields=['last_message_at'])

        # Broadcast deletion to WebSockets
        broadcast_delete_message(conv, msg_id_str)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Webhook View 
class WebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """Meta webhook verification handshake."""
        mode      = request.query_params.get('hub.mode')
        token     = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')

        instance = WhatsappInstance.objects.filter(
            webhook_verify_token=token,
            is_active=True
        ).order_by('-created_at').first()
        if mode == 'subscribe' and instance:
            logger.info(f"Webhook verified for instance: {instance.display_name}")
            return HttpResponse(challenge, content_type='text/plain')

        logger.warning(f"Webhook verification failed. Token: {token}")
        return HttpResponse(status=403)

    def post(self, request):
        try:
            payload = request.data
            entry   = payload.get('entry', [])

            for e in entry:
                waba_id = e.get('id')
                
                for change in e.get('changes', []):
                    field = change.get('field')
                    value = change.get('value', {})
                    
                    if field == 'message_template_status_update':
                        self._handle_template_status_update(value, waba_id)
                    elif field == 'messages':
                        self._process_webhook_value(value)
                    else:
                        self._process_webhook_value(value)

        except Exception as exc:
            logger.exception(f"Webhook processing error: {exc}")
        # Always return 200 to Meta — otherwise it retries indefinitely
        return Response({'status': 'ok'})

    def _process_webhook_value(self, value: dict):
        """Parse one 'value' block from the Meta payload."""
        phone_number_id = value.get('metadata', {}).get('phone_number_id')
        instance = WhatsappInstance.objects.filter(
            phone_number_id=phone_number_id,
            is_active=True
        ).order_by('-created_at').first()

        # Handle incoming messages
        for msg_data in value.get('messages', []):
            self._handle_inbound_message(msg_data, instance)

        # Handle status updates (delivered / read / failed)
        for status_data in value.get('statuses', []):
            self._handle_status_update(status_data)

    def _handle_inbound_message(self, msg_data: dict, instance):
        """
        1. Upsert Contact (get_or_create by wa_id)
        2. Get or create Conversation
        3. Save Message
        4. Broadcast via WebSocket
        """
        wa_id = msg_data.get('from')  
        wa_msg_id = msg_data.get('id')
        msg_type  = msg_data.get('type', 'text')

        #  Upsert contact
        contact, _ = Contact.objects.get_or_create(
            wa_id=wa_id,
            defaults={
                'phone': f'+{wa_id}',
                'is_saved': False,
                'source': 'inbound',
            }
        )

        # Update name from profile if available
        profile = msg_data.get('profile', {})
        if profile.get('name') and not contact.name:
            contact.name = profile['name']
            contact.save(update_fields=['name', 'updated_at'])

        #  Get or create conversation
        conv, created = Conversation.objects.get_or_create(
            contact=contact,
            instance=instance,
            status__in=['open', 'pending'],
            defaults={'status': 'open'},
        )
        if not created and conv.status == 'resolved':
            conv.status = 'open'
            conv.save(update_fields=['status'])

        #  Extract body and handle media
        body = ''
        media_url = ''
        storage_path = ''
        
        if msg_type == 'text':
            body = msg_data.get('text', {}).get('body', '')

        elif msg_type in ['image', 'video', 'audio', 'document', 'sticker']:
            media_obj = msg_data.get(msg_type, {})
            media_id = media_obj.get('id')
            
            is_voice = (msg_type == 'audio' and media_obj.get('voice', False))
            if is_voice:
                msg_type = 'audio'
                
            if msg_type == 'document':
                body = media_obj.get('filename', '')
                
            if media_id and instance and instance.access_token:
                from .utils import download_whatsapp_media
                downloaded = download_whatsapp_media(
                    media_id=media_id,
                    access_token=instance.access_token,
                    phone=contact.phone
                )
                if downloaded:
                    storage_path = downloaded.get('storage_path', '')
                    media_url = downloaded.get('media_url', '')

        # Check for context/replies
        context_data = msg_data.get('context', {})
        context_id = context_data.get('id')
        replied_to_obj = None
        if context_id:
            replied_to_obj = Message.objects.filter(wa_message_id=context_id).first()

        # Parse timestamp
        ts_raw = msg_data.get('timestamp')
        ts = datetime.fromtimestamp(int(ts_raw), tz=timezone.utc) if ts_raw else django_tz.now()

        msg = Message.objects.create(
            conversation=conv,
            wa_message_id=wa_msg_id,
            direction='inbound',
            msg_type=msg_type,
            body=body,
            media_url=media_url,
            storage_path=storage_path,
            replied_to=replied_to_obj,
            status='delivered',
            timestamp=ts,
        )

        # Update conversation metadata
        conv.last_message_at = ts
        conv.unread_count    = conv.unread_count + 1
        conv.save(update_fields=['last_message_at', 'unread_count'])

        logger.info(f"Saved inbound message from {wa_id}: {body[:60]}")

        # Broadcast to the assigned agent's WebSocket group in real-time
        broadcast_new_message(conv, msg)
        broadcast_conversation_update(conv)

        # Auto-create pipeline deal on first inbound message 
        self._maybe_create_pipeline_deal(contact, conv, instance)
        ai_settings = AIAgentSettings.objects.filter(instance=instance).first()

        if ai_settings and ai_settings.is_active:
            if getattr(settings, 'CELERY_ENABLED', True):
                from apps.ai.tasks import handle_inbound_message
                handle_inbound_message.delay(conv.id)
            else:
                logger.warning("AI auto-reply skipped because CELERY_ENABLED is false.")

    def _handle_status_update(self, status_data: dict):
        """Update message delivery/read status from Meta callbacks."""
        wa_msg_id  = status_data.get('id')
        new_status = status_data.get('status') 
        if wa_msg_id and new_status:
            msg = Message.objects.filter(wa_message_id=wa_msg_id).first()
            if msg:
                msg.status = new_status
                msg.save(update_fields=['status'])
                from .utils import broadcast_message_status_update
                broadcast_message_status_update(msg.conversation, wa_msg_id, new_status)


    def _handle_template_status_update(self, value: dict, waba_id: str):
        from apps.whatsapp.models import WhatsappTemplate
        
        event = value.get('event') 
        template_id = str(value.get('message_template_id', ''))
        template_name = value.get('message_template_name')
        template_language = value.get('message_template_language')
        reason = value.get('reason', '')
        
        if not event or not template_id:
            return
            
        try:
            # lookup by meta_id
            template = WhatsappTemplate.objects.filter(meta_id=template_id).first()
            
            # Fallback to name/language if meta_id isn't saved yet
            if not template and template_name and template_language:
                template = WhatsappTemplate.objects.filter(
                    name=template_name, 
                    language=template_language
                ).order_by('-created_at').first()
                
            if template:
                template.status = event
                template.rejection_reason = reason if event == 'REJECTED' else ''
                template.meta_id = template_id 
                template.save(update_fields=['status', 'rejection_reason', 'meta_id'])
                logger.info(f"Webhook updated template {template_name} to {event}")
        except Exception as e:
            logger.error(f"Error updating template status from webhook: {e}")


    def _maybe_create_pipeline_deal(self, wa_contact, conv, instance):

        try:
            from apps.contacts.models import Pipeline, PipelineDeal

            # Find the instance user
            owner = instance.user if instance and hasattr(instance, 'user') else None
            if not owner:
                return

            # Look for the active pipeline with auto-create enabled
            pipeline = Pipeline.objects.filter(
                owner=owner,
                is_active=True,
                auto_create_deals=True,
            ).first()
            if not pipeline:
                return

            # Only create one deal per wa_contact per pipeline
            if PipelineDeal.objects.filter(pipeline=pipeline, wa_contact=wa_contact).exists():
                return

            # Guarantee the deal lands in the very first column (order=1)
            stage = pipeline.stages.filter(order=1).first()
            if not stage:
                stage = pipeline.stages.order_by('order').first()
            if not stage:
                from apps.contacts.models import PipelineStage
                stage = PipelineStage.objects.create(
                    pipeline=pipeline,
                    title='Incoming Leads',
                    order=1,
                    owner=owner,
                )

            deal_name = wa_contact.name or wa_contact.phone or 'New Lead'
            PipelineDeal.objects.create(
                pipeline=pipeline,
                stage=stage,
                owner=owner,
                wa_contact=wa_contact,
                name=deal_name,
                value=0,
                note=f'Auto-created from inbound WhatsApp message.',
            )
            logger.info(f"Auto-created pipeline deal for contact {wa_contact.phone} in pipeline '{pipeline.name}'")
        except Exception as e:
            logger.error(f"Error in _maybe_create_pipeline_deal: {e}")
