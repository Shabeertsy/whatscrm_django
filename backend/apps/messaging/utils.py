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


import requests
import mimetypes



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
        
        # WhatsApp strictly requires OGG/Opus. WebM is rejected.
        if mime == 'audio/webm' or ext == '.webm':
            try:
                import imageio_ffmpeg
                import subprocess
                import tempfile
                ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
                
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(0)
                    
                with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tf_in:
                    tf_in.write(file_obj.read())
                    tf_in.flush()
                    tf_in_path = tf_in.name
                    
                tf_out_path = tf_in_path.replace('.webm', '.ogg')
                
                result = subprocess.run([
                    ffmpeg_exe, '-y', '-i', tf_in_path, 
                    '-c:a', 'libopus', '-b:a', '32k',
                    tf_out_path
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    result.check_returncode()
                
                with open(tf_out_path, 'rb') as f:
                    ext = '.ogg'
                    mime = 'audio/ogg'
                    filename = filename.replace('.webm', '.ogg')
                    file_obj = ContentFile(f.read(), name=filename)
                    
                os.remove(tf_in_path)
                os.remove(tf_out_path)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to transcode WebM to OGG: {e}")
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(0)
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
    
    contact_name = conv.contact.name
    try:
        if hasattr(conv.contact, 'crm_contact') and conv.contact.crm_contact:
            contact_name = conv.contact.crm_contact.name
    except Exception:
        pass

    contact_phone = conv.contact.phone
    if not contact_phone:
        contact_phone = f"+{conv.contact.wa_id}" if conv.contact.wa_id else ""

    async_to_sync(channel_layer.group_send)(
        target_group,
        {
            "type":            "new_message",
            "conversation_id": str(conv.id),
            "contact_name":    contact_name,
            "contact_phone":   contact_phone,
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

def broadcast_message_status_update(conv, wa_msg_id, status):
    """Push a message status update to the frontend."""
    target_group = f"inbox_{conv.assigned_agent.id}" if conv.assigned_agent else "inbox_global"
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        target_group,
        {
            "type":            "message_status_update",
            "conversation_id": str(conv.id),
            "message_id":      str(wa_msg_id),
            "status":          status,
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




def download_whatsapp_media(media_id, access_token, phone):
    """
    Downloads media from WhatsApp Cloud API and saves it using save_whatsapp_media.
    """
    url = f"https://graph.facebook.com/v17.0/{media_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Get media URL
    res = requests.get(url, headers=headers, timeout=10)
    if not res.ok:
        import logging
        logging.getLogger(__name__).error(f"Failed to get media url for {media_id}: {res.text}")
        return None
        
    data = res.json()
    media_url = data.get('url')
    mime_type = data.get('mime_type', 'application/octet-stream')
    
    if not media_url:
        return None
        
    #  Download file
    res2 = requests.get(media_url, headers=headers, timeout=20)
    if not res2.ok:
        return None
        
    # Save file
    ext = mimetypes.guess_extension(mime_type) or '.bin'
    file_obj = ContentFile(res2.content, name=f"downloaded{ext}")
    file_obj.content_type = mime_type
    
    saved_data = save_whatsapp_media(file_obj, phone)
    saved_path = saved_data['path']
    return {
        "storage_path": saved_path,
        "media_url": f"{settings.MEDIA_URL}{saved_path}" if hasattr(settings, 'MEDIA_URL') else f"/media/{saved_path}"
    }


def upload_whatsapp_media(phone_number_id, access_token, storage_path, mime_type):
    """
    Uploads a local file to WhatsApp Cloud API to get a media ID.
    This bypasses the need for a publicly accessible localhost URL.
    """
    url = f"https://graph.facebook.com/v17.0/{phone_number_id}/media"
    headers = {"Authorization": f"Bearer {access_token}"}
    absolute_path = default_storage.path(storage_path)
    
    with open(absolute_path, 'rb') as f:
        files = {
            'file': (os.path.basename(absolute_path), f, mime_type)
        }
        data = {
            'messaging_product': 'whatsapp',
            'type': mime_type
        }
        res = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        if not res.ok:
            import logging
            logging.getLogger(__name__).error(f"Meta upload failed: {res.text}")
            
        res.raise_for_status()
        return res.json().get('id')



def send_whatsapp_message(phone_number_id, access_token, to_phone, message_text="", msg_type="text", media_url="", reply_to_wa_id="", filename="", storage_path=""):
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
    elif msg_type in ["image", "video", "document", "audio"]:
        # Try to upload the file directly if we have a local storage path
        media_id = None
        if storage_path:
            import mimetypes
            mime_type, _ = mimetypes.guess_type(storage_path)
            if not mime_type:
                mime_type = 'application/octet-stream'
                
            try:
                media_id = upload_whatsapp_media(phone_number_id, access_token, storage_path, mime_type)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to upload media to Meta: {e}")
                
        # Use media_id if upload succeeded, otherwise fallback to link
        media_payload = {}
        if media_id:
            media_payload = {"id": media_id}
        else:
            media_payload = {"link": media_url}
            
        if message_text and msg_type != "audio":
            media_payload["caption"] = message_text
        if msg_type == "document" and filename:
            media_payload["filename"] = filename
            
        data[msg_type] = media_payload

    if reply_to_wa_id:
        data["context"] = {"message_id": reply_to_wa_id}

    response = requests.post(url, headers=headers, json=data, timeout=10)
    response.raise_for_status()
    return response.json()
