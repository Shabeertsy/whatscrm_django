import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class InboxConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        """
        Called when the WebSocket handshake is complete.
        We authenticate via a JWT token in the query string because
        standard HTTP cookies/session auth doesn't carry over to WS.
        """
        # Read the user injected by our JWTAuthMiddleware
        user = self.scope.get('user')

        if user is None or not user.is_authenticated:
            logger.warning("WebSocket rejected — unauthenticated connection attempt")
            await self.close(code=4001)
            return

        self.user       = user
        self.group_name = f"inbox_{user.id}"
        self.global_group = "inbox_global"

        # Join the user's private inbox group and the global inbox group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(self.global_group, self.channel_name)
        await self.accept()

        logger.info(f"WS connected: user={user.email} group={self.group_name}")
        await self.send(text_data=json.dumps({"type": "connected", "message": "Inbox live."}))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if hasattr(self, 'global_group'):
            await self.channel_layer.group_discard(self.global_group, self.channel_name)
            logger.info(f"WS disconnected: group={self.group_name} code={close_code}")

    async def receive(self, text_data):
        """
        Handle messages sent FROM the browser over WebSocket.
        Currently used for typing indicators and ping/pong heartbeats.
        Actual message sending goes through the REST API (POST /conversations/:id/send/).
        """
        try:
            data = json.loads(text_data)
            event_type = data.get("type")

            if event_type == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))

            elif event_type == "typing":
                # Could broadcast typing indicator to assigned agent — future feature
                pass

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"WS receive error: {e}")

    #  Channel Layer Event Handlers 
    # These are called by channel_layer.group_send() from the webhook view.

    async def new_message(self, event):
        """Broadcast a new inbound message to the browser."""
        await self.send(text_data=json.dumps({
            "type":            "new_message",
            "conversation_id": event["conversation_id"],
            "message":         event["message"],
        }))

    async def conversation_update(self, event):
        """Broadcast conversation status/unread changes."""
        await self.send(text_data=json.dumps({
            "type":         "conversation_update",
            "conversation": event["conversation"],
        }))

    async def delete_message(self, event):
        """Broadcast a message deletion to the browser."""
        await self.send(text_data=json.dumps({
            "type":            "delete_message",
            "conversation_id": event["conversation_id"],
            "message_id":      event["message_id"],
        }))

