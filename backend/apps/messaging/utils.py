from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .serializers import MessageSerializer, ConversationListSerializer


def broadcast_new_message(conv, msg):
    """Push a new_message event to the assigned agent's WS group, or global if unassigned."""
    target_group = f"inbox_{conv.assigned_agent.id}" if conv.assigned_agent else "inbox_global"
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        target_group,
        {
            "type":            "new_message",
            "conversation_id": str(conv.id),
            "message":         MessageSerializer(msg).data,
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
            "conversation": ConversationListSerializer(conv).data,
        }
    )


import requests

def send_whatsapp_message(phone_number_id, access_token, to_phone, message_text="", msg_type="text", media_url=""):
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
    elif msg_type == "audio":
        data["audio"] = {"link": media_url}

    response = requests.post(url, headers=headers, json=data, timeout=10)
    response.raise_for_status()
    return response.json()
