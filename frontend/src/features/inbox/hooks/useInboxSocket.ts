import { useEffect, useRef } from 'react';
import { tokenService } from '../../../api/token';
import { messagingStore } from '../../../store/messagingStore';
import type { Message } from '../../../api/messaging';
import { showToast } from '../../../utils/toast';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000';

export function useInboxSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    const token = tokenService.getAccess();
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/inbox/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Inbox WS] Connected');
      messagingStore.setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_message') {
          const { message, conversation_id, contact_name, contact_phone } = data;

          // Add message to the store
          messagingStore.pushMessage(conversation_id, message);

          // Update the conversation's last message preview + bump unread if not active
          const activeId = messagingStore.getState().activeConversationId;
          messagingStore.updateConversationMeta(conversation_id, {
            last_message: {
              body: message.body,
              direction: message.direction,
              msg_type: message.msg_type,
            },
            last_message_at: message.timestamp,
            unread_count:
              activeId === conversation_id
                ? 0
                : (messagingStore
                    .getState()
                    .conversations.find((c) => c.id === conversation_id)
                    ?.unread_count ?? 0) + 1,
          });

          // Show browser notification if it's an inbound message and not in the currently active chat
          if (message.direction === 'inbound' && activeId !== conversation_id) {
            // Use contact details directly from the websocket payload to ensure it works even for brand new conversations
            const contactName = contact_name || contact_phone || 'Customer';
            const notificationBody = message.msg_type === 'text' ? message.body : `Sent a ${message.msg_type}`;
            
            if (document.hidden) {
              if (Notification.permission === 'granted') {
                new Notification(`New message from ${contactName}`, { body: notificationBody });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    new Notification(`New message from ${contactName}`, { body: notificationBody });
                  }
                });
              }
            } else {
              showToast(`New from ${contactName}`, notificationBody, 'success');
            }
          }
        }

        if (data.type === 'conversation_update') {
          const { conversation } = data;
          messagingStore.updateConversationMeta(conversation.id, conversation);
        }

        if (data.type === 'delete_message') {
          const { conversation_id, message_id } = data as { conversation_id: string, message_id: string };
          messagingStore.removeMessage(conversation_id, message_id);
          // (Optional) We could also trigger a metadata refresh here, but removing it visually is usually enough
        }

        if (data.type === 'message_status_update') {
          const { conversation_id, message_id, status, error } = data as { conversation_id: string, message_id: string, status: string, error?: string };
          messagingStore.updateMessage(conversation_id, message_id, { status: status as any });
          
          if (status === 'failed' && error) {
             showToast('Message Failed', error, 'error');
          }
        }

        if (data.type === 'message_update') {
          const { conversation_id, message } = data as { conversation_id: string, message: Message };
          messagingStore.updateMessage(conversation_id, message.id, message);
        }

      } catch (err) {
        console.warn('[Inbox WS] Parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[Inbox WS] Error:', err);
    };

    ws.onclose = (event) => {
      messagingStore.setConnected(false);
      console.log('[Inbox WS] Closed:', event.code);
      // Auto-reconnect after 3 seconds (unless deliberately closed)
      if (event.code !== 1000) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []);
}

export default useInboxSocket;
