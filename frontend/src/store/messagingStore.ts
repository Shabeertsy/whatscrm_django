import { useState, useEffect } from 'react';
import type { Conversation, Message, ConversationDetail } from '../api/messaging';


//  State Shape 
interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  // Messages keyed by conversation ID — loaded on demand
  messagesByConvId: Record<string, Message[]>;
  filter: 'all' | 'open' | 'pending' | 'resolved';
  search: string;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isConnected: boolean;   // WebSocket status
  error: string | null;
}

const initialState: MessagingState = {
  conversations: [],
  activeConversationId: null,
  messagesByConvId: {},
  filter: 'all',
  search: '',
  isLoadingConversations: false,
  isLoadingMessages: false,
  isConnected: false,
  error: null,
};




// ── Micro Store (same pattern as authStore) ───────────────────────────────────

type Listener = () => void;

class MessagingStore {
  private state: MessagingState = initialState;
  private listeners = new Set<Listener>();

  getState = () => this.state;

  setState = (next: Partial<MessagingState> | ((s: MessagingState) => Partial<MessagingState>)) => {
    const patch = typeof next === 'function' ? next(this.state) : next;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };



  // ── Actions ────────────────────────────────────────────────────────────────

  setConversations = (conversations: Conversation[]) =>
    this.setState({ conversations, isLoadingConversations: false, error: null });

  setActiveConversation = (id: string) => {
    this.setState({ activeConversationId: id });
  };

  setMessages = (conversationId: string, messages: Message[]) => {
    this.setState((s) => ({
      messagesByConvId: { ...s.messagesByConvId, [conversationId]: messages },
      isLoadingMessages: false,
    }));
  };

  /** Add a single new message (from WebSocket or after sending) */
  pushMessage = (conversationId: string, message: Message) => {
    this.setState((s) => {
      // IMPORTANT: If we haven't fetched the full history for this chat yet,
      // do NOT create an array with just 1 message. Otherwise, Inbox.tsx
      // will assume the history is loaded and never fetch the older messages.
      if (!s.messagesByConvId[conversationId]) {
        return {};
      }
      
      const existing = s.messagesByConvId[conversationId];
      // Avoid duplicates (WS + REST could both fire)
      if (existing.find((m) => m.id === message.id)) return {};
      
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [conversationId]: [...existing, message],
        },
      };
    });
  };

  /** Remove a message from the local store */
  removeMessage = (conversationId: string, messageId: string) => {
    this.setState((s) => {
      if (!s.messagesByConvId[conversationId]) return {};
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [conversationId]: s.messagesByConvId[conversationId].filter(m => String(m.id) !== String(messageId)),
        },
      };
    });
  };

  /** Update an existing message in the local store */
  updateMessage = (conversationId: string, messageId: string, patch: Partial<Message>) => {
    this.setState((s) => {
      if (!s.messagesByConvId[conversationId]) return {};
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [conversationId]: s.messagesByConvId[conversationId].map((m) =>
            String(m.id) === String(messageId) || m.wa_message_id === messageId
              ? { ...m, ...patch }
              : m
          ),
        },
      };
    });
  };



  /** Update conversation's last_message preview + unread count */
  updateConversationMeta = (conversationId: string, patch: Partial<Conversation>) => {
    this.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...patch } : c
      ),
    }));
  };

  markRead = (conversationId: string) => {
    this.updateConversationMeta(conversationId, { unread_count: 0 });
  };

  updateStatus = (conversationId: string, status: Conversation['status']) => {
    this.updateConversationMeta(conversationId, { status });
  };

  setFilter = (filter: MessagingState['filter']) => this.setState({ filter });
  setSearch = (search: string) => this.setState({ search });
  setConnected = (isConnected: boolean) => this.setState({ isConnected });
  setError = (error: string | null) => this.setState({ error });
}

export const messagingStore = new MessagingStore();



// ── React Hook ────────────────────────────────────────────────────────────────

export function useMessagingStore() {
  const [state, setState] = useState(messagingStore.getState());

  useEffect(() => {
    return messagingStore.subscribe(() => setState(messagingStore.getState()));
  }, []);

  return [state, messagingStore] as const;
}
