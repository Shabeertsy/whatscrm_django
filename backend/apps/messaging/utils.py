from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .serializers import MessageSerializer


def broadcast_new_message(conv, msg):
    """Push a new_message event to the assigned agent's WS group."""
    agent = conv.assigned_agent
    if not agent:
        return
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"inbox_{agent.id}",
        {
            "type":            "new_message",
            "conversation_id": str(conv.id),
            "message":         MessageSerializer(msg).data,
        }
    )
    

def broadcast_delete_message(conv, msg_id_str):
    """Push a delete_message event to the assigned agent's WS group."""
    agent = conv.assigned_agent
    if not agent:
        return
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"inbox_{agent.id}",
        {
            "type":            "delete_message",
            "conversation_id": str(conv.id),
            "message_id":      str(msg_id_str),
        }
    )
