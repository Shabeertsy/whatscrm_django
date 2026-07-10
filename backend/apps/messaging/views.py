import json
import logging
from datetime import datetime, timezone

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone as django_tz
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage
import os
import uuid


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
from .utils import broadcast_new_message, broadcast_delete_message, send_whatsapp_message, broadcast_conversation_update
from django.conf import settings


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
            'contact', 'instance', 'assigned_agent'
        ).prefetch_related('messages')

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
            'contact', 'instance', 'assigned_agent'
        ).prefetch_related('messages')
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
        
        reply_to_message_id = serializer.validated_data.get('reply_to_message_id')
        replied_to_obj = None
        reply_to_wa_id = ""
        if reply_to_message_id:
            replied_to_obj = Message.objects.filter(id=reply_to_message_id).first()
            if replied_to_obj and replied_to_obj.wa_message_id:
                reply_to_wa_id = replied_to_obj.wa_message_id
                
        # Meta Graph API Call
        wa_message_id = ""
        msg_status = "failed"
        
        if conv.instance and conv.instance.is_active:
            try:
                wa_response = send_whatsapp_message(
                    phone_number_id=conv.instance.phone_number_id,
                    access_token=conv.instance.access_token,
                    to_phone=conv.contact.wa_id,
                    message_text=body,
                    msg_type=msg_type,
                    media_url=media_url,
                    reply_to_wa_id=reply_to_wa_id
                )
                if 'messages' in wa_response and len(wa_response['messages']) > 0:
                    wa_message_id = wa_response['messages'][0]['id']
                    msg_status = "sent"
            except Exception as e:
                logger.error(f"Failed to send WhatsApp message: {e}")

        msg = Message.objects.create(
            conversation=conv,
            direction='outbound',
            msg_type=serializer.validated_data.get('msg_type', 'text'),
            body=body,
            media_url=serializer.validated_data.get('media_url', ''),
            related_room_uuid=related_room_uuid if related_room_uuid else None,
            replied_to=replied_to_obj,
            sent_by=request.user,
            status=msg_status,
            wa_message_id=wa_message_id,
            timestamp=django_tz.now(),
        )

        # Update conversation's last_message_at
        conv.last_message_at = msg.timestamp
        conv.save(update_fields=['last_message_at'])

        # Broadcast to the agent's WebSocket in real-time
        broadcast_new_message(conv, msg)
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


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
            
        if file_obj.size > 16 * 1024 * 1024:
            return Response({"detail": "File size exceeds the 16MB limit."}, status=status.HTTP_400_BAD_REQUEST)

        ALLOWED_TYPES = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf', 'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'video/mp4', 'video/mpeg', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/amr', 'audio/aac'
        ]
        
        if file_obj.content_type not in ALLOWED_TYPES:
            return Response({"detail": f"File type {file_obj.content_type} is not supported."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file_obj.name)[1]
        filename = f"{uuid.uuid4()}{ext}"
        saved_path = default_storage.save(f"whatsapp_media/{filename}", file_obj)
        
        if getattr(settings, 'BACKEND_PUBLIC_URL', None):
            base_url = settings.BACKEND_PUBLIC_URL.rstrip('/')
            file_url = f"{base_url}{default_storage.url(saved_path)}"
        else:
            file_url = request.build_absolute_uri(default_storage.url(saved_path))
        
        return Response({
            "url": file_url,
            "filename": file_obj.name,
            "type": file_obj.content_type
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
        if msg.media_url and '/media/whatsapp_media/' in msg.media_url:
            try:
                path_suffix = msg.media_url.split('/media/')[-1]
                if default_storage.exists(path_suffix):
                    default_storage.delete(path_suffix)
            except Exception as e:
                logging.error(f"Failed to delete media file {msg.media_url}: {str(e)}")

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
    """
    Handles inbound messages from Meta Cloud API.
    """
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
                for change in e.get('changes', []):
                    value = change.get('value', {})
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

        #  Extract body
        body = ''
        if msg_type == 'text':
            body = msg_data.get('text', {}).get('body', '')

        # Check for context/replies
        context_data = msg_data.get('context', {})
        context_id = context_data.get('id')
        replied_to_obj = None
        if context_id:
            replied_to_obj = Message.objects.filter(wa_message_id=context_id).first()

        # Parse timestamp
        ts_raw = msg_data.get('timestamp')
        ts = datetime.fromtimestamp(int(ts_raw), tz=timezone.utc) if ts_raw else django_tz.now()

        # Save message
        msg = Message.objects.create(
            conversation=conv,
            wa_message_id=wa_msg_id,
            direction='inbound',
            msg_type=msg_type,
            body=body,
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

    def _handle_status_update(self, status_data: dict):
        """Update message delivery/read status from Meta callbacks."""
        wa_msg_id  = status_data.get('id')
        new_status = status_data.get('status') 
        if wa_msg_id and new_status:
            Message.objects.filter(wa_message_id=wa_msg_id).update(status=new_status)
