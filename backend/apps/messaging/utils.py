import json
import uuid
import os
import re
from io import BytesIO
from PIL import Image, ImageOps
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .serializers import MessageSerializer, ConversationListSerializer


def save_whatsapp_media(file_obj, phone=None):
    mime = file_obj.content_type
    
    ext = os.path.splitext(file_obj.name)[1]
    if not ext:
        if mime == 'audio/webm': ext = '.webm'
        elif mime == 'audio/ogg': ext = '.ogg'
        elif mime == 'video/mp4': ext = '.mp4'
        elif mime == 'image/jpeg': ext = '.jpg'
        elif mime == 'image/png': ext = '.png'
        
    # Better filename: YYYYMMDD_shortuuid
    date_str = timezone.now().strftime('%Y%m%d')
    short_uuid = uuid.uuid4().hex[:8]
    filename = f"{date_str}_{short_uuid}{ext}"
    
    if mime.startswith('image/'):
        subfolder = 'images'
        
        # Don't compress tiny images
        if file_obj.size > 300 * 1024 and mime in ['image/jpeg', 'image/png', 'image/webp']:
            try:
                img = Image.open(file_obj)
                # Preserve EXIF orientation
                img = ImageOps.exif_transpose(img)
                
                # Handle transparency safely
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGBA")
                    
                # Resize before compression
                if hasattr(Image, 'Resampling'):
                    img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                else:
                    img.thumbnail((1920, 1920), Image.LANCZOS)
                
                quality = 90
                output = BytesIO()
                
                # Compress to WebP and ensure size is < 1MB
                while quality > 10:
                    output.seek(0)
                    output.truncate(0)
                    img.save(output, format='WEBP', quality=quality)
                    if output.tell() <= 1024 * 1024:
                        break
                    quality -= 10
                
                output.seek(0)
                ext = '.webp'
                mime = 'image/webp'
                filename = f"{date_str}_{short_uuid}{ext}"
                file_obj = ContentFile(output.read(), name=filename)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Image compression failed: {e}")
            finally:
                # Reset original file pointer just in case
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(0)

    elif mime.startswith('video/'):
        subfolder = 'videos'
    elif mime.startswith('audio/'):
        subfolder = 'audio'
    else:
        subfolder = 'documents'
        
    # Sanitize the phone number
    phone_dir = re.sub(r"[^0-9+]", "", phone) if phone else "general"
    if not phone_dir: phone_dir = "general"
    
    month_path = timezone.now().strftime('%Y/%m')
    base_path = f"whatsapp_media/{phone_dir}/{month_path}/{subfolder}"
    saved_path = default_storage.save(f"{base_path}/{filename}", file_obj)
    
    return {
        "path": saved_path,
        "mime": mime,
        "size": file_obj.size,
        "filename": filename,
    }


def broadcast_new_message(conv, msg):
    """Push a new_message event to the assigned agent's WS group, or global if unassigned."""
    target_group = f"inbox_{conv.assigned_agent.id}" if conv.assigned_agent else "inbox_global"
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        target_group,
        {
            "type":            "new_message",
            "conversation_id": str(conv.id),
            "message":         json.loads(json.dumps(MessageSerializer(msg).data, cls=DjangoJSONEncoder)),
        }
    )
    

def broadcast_delete_message(conv, msg_id_str):
    """Push a delete_message event to the assigned agent's WS group, or global if unassigned."""
    target_group = f"inbox_{conv.assigned_agent.id}" if conv.assigned_agent else "inbox_global"
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        target_group,
        {
            "type":            "delete_message",
            "conversation_id": str(conv.id),
            "message_id":      str(msg_id_str),
        }
    )

def broadcast_conversation_update(conv):
    """Push a conversation_update event to update unread_count and status on the frontend."""
    target_group = f"inbox_{conv.assigned_agent.id}" if conv.assigned_agent else "inbox_global"
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        target_group,
        {
            "type":         "conversation_update",
            "conversation": json.loads(json.dumps(ConversationListSerializer(conv).data, cls=DjangoJSONEncoder)),
        }
    )


import requests

def send_whatsapp_message(phone_number_id, access_token, to_phone, message_text="", msg_type="text", media_url="", reply_to_wa_id="", filename=""):
    """
    Sends an outbound message using the Meta WhatsApp Cloud API.
    Supports text, image, video, document, and audio.
    """
    url = f"https://graph.facebook.com/v17.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    data = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": msg_type,
    }
    
    if msg_type == "text":
        data["text"] = {"preview_url": False, "body": message_text}
    elif msg_type in ["image", "video", "document"]:
        data[msg_type] = {"link": media_url}
        if message_text:
            data[msg_type]["caption"] = message_text
        if msg_type == "document" and filename:
            data[msg_type]["filename"] = filename
    elif msg_type == "audio":
        data["audio"] = {"link": media_url}

    if reply_to_wa_id:
        data["context"] = {"message_id": reply_to_wa_id}

    response = requests.post(url, headers=headers, json=data, timeout=10)
    response.raise_for_status()
    return response.json()
