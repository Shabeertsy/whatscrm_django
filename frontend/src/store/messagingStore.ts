import { useState, useEffect } from 'react';
import type { Conversation, Message } from '../api/messaging';


//  State Shape 
interface MessagingState {
  conversations: Conversation[];
  hasMoreConversations: boolean;
  conversationOffset: number;
  activeConversationId: string | null;
  messagesByConvId: Record<string, Message[]>;
  hasMoreMessages: Record<string, boolean>;
  messageOffsets: Record<string, number>;
  filter: 'all' | 'open' | 'pending' | 'resolved';
  search: string;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  isConnected: boolean;   // WebSocket status
  error: string | null;
}

const initialState: MessagingState = {
  conversations: [],
  hasMoreConversations: false,
  conversationOffset: 0,
  activeConversationId: null,
  messagesByConvId: {},
  hasMoreMessages: {},
  messageOffsets: {},
  filter: 'all',
  search: '',
  isLoadingConversations: false,
  isLoadingMessages: false,
  isLoadingMoreMessages: false,
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



  // ── Actions ─────────────────────────────

  setConversations = (conversations: Conversation[], hasMore: boolean = false, offset: number = 0) =>
    this.setState({ conversations, hasMoreConversations: hasMore, conversationOffset: offset, isLoadingConversations: false, error: null });

  appendConversations = (olderConversations: Conversation[], hasMore: boolean, offset: number) => {
    this.setState((s) => {
      // Filter out duplicates just in case
      const existingIds = new Set(s.conversations.map(c => c.id));
      const uniqueOlder = olderConversations.filter(c => !existingIds.has(c.id));
      
      return {
        conversations: [...s.conversations, ...uniqueOlder],
        hasMoreConversations: hasMore,
        conversationOffset: offset,
      };
    });
  };

  setActiveConversation = (id: string | null) => {
    this.setState({ activeConversationId: id });
  };

  removeConversation = (id: string) => {
    this.setState((s) => ({
      conversations: s.conversations.filter(c => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId
    }));
  };


  setMessages = (conversationId: string, messages: Message[], hasMore: boolean, offset: number) => {
    this.setState((s) => ({
      messagesByConvId: { ...s.messagesByConvId, [conversationId]: messages },
      hasMoreMessages: { ...s.hasMoreMessages, [conversationId]: hasMore },
      messageOffsets: { ...s.messageOffsets, [conversationId]: offset },
      isLoadingMessages: false,
    }));
  };

  prependMessages = (conversationId: string, olderMessages: Message[], hasMore: boolean, offset: number) => {
    this.setState((s) => {
      const current = s.messagesByConvId[conversationId] || [];
      // Combine and remove duplicates, older messages should be at the top of the array since they have older timestamps.
      // But wait, our backend ordered by `-timestamp` which means the newest are first in the paginated response!
      // So the frontend array needs to be reversed if the UI expects older messages at the top.
      // Actually, let's see how the frontend renders them. 
      // If messages.map renders top-down, the oldest must be index 0.
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [conversationId]: [...olderMessages, ...current]
        },
        hasMoreMessages: { ...s.hasMoreMessages, [conversationId]: hasMore },
        messageOffsets: { ...s.messageOffsets, [conversationId]: offset },
        isLoadingMoreMessages: false,
      };
    });
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
    this.setState((s) => {
      let needsSort = false;
      const updatedConversations = s.conversations.map((c) => {
        if (c.id === conversationId) {
          if (patch.last_message_at) {
            needsSort = true;
          }
          return { ...c, ...patch };
        }
        return c;
      });

      if (needsSort) {
        updatedConversations.sort((a, b) => {
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });
      }

      return { conversations: updatedConversations };
    });
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



// ── React Hook ────────────────────────
export function useMessagingStore() {
  const [state, setState] = useState(messagingStore.getState());

  useEffect(() => {
    return messagingStore.subscribe(() => setState(messagingStore.getState()));
  }, []);

  return [state, messagingStore] as const;
}
