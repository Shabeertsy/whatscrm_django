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

  setConversations = (conversations: Conversation[], hasMore: boolean = false, offset: number = 0) => {
    const normalizedConvs = conversations.map(c => ({ ...c, id: String(c.id) }));
    this.setState((s) => {
      let finalConversations = normalizedConvs;
      if (s.activeConversationId) {
        const activeIdStr = String(s.activeConversationId);
        const existsInNew = normalizedConvs.some(c => String(c.id) === activeIdStr);
        if (!existsInNew) {
          const currentActive = s.conversations.find(c => String(c.id) === activeIdStr);
          if (currentActive) {
            finalConversations = [currentActive, ...normalizedConvs];
          }
        }
      }
      return {
        conversations: finalConversations,
        hasMoreConversations: hasMore,
        conversationOffset: offset,
        isLoadingConversations: false,
        error: null,
      };
    });
  };

  appendConversations = (olderConversations: Conversation[], hasMore: boolean, offset: number) => {
    const normalizedOlder = olderConversations.map(c => ({ ...c, id: String(c.id) }));
    this.setState((s) => {
      // Filter out duplicates just in case
      const existingIds = new Set(s.conversations.map(c => String(c.id)));
      const uniqueOlder = normalizedOlder.filter(c => !existingIds.has(String(c.id)));
      
      return {
        conversations: [...s.conversations, ...uniqueOlder],
        hasMoreConversations: hasMore,
        conversationOffset: offset,
      };
    });
  };

  setActiveConversation = (id: string | number | null) => {
    this.setState({ activeConversationId: id ? String(id) : null });
  };

  removeConversation = (id: string | number) => {
    const idStr = String(id);
    this.setState((s) => ({
      conversations: s.conversations.filter(c => String(c.id) !== idStr),
      activeConversationId: String(s.activeConversationId) === idStr ? null : s.activeConversationId
    }));
  };


  setMessages = (conversationId: string | number, messages: Message[], hasMore: boolean, offset: number) => {
    const convIdStr = String(conversationId);
    this.setState((s) => ({
      messagesByConvId: { ...s.messagesByConvId, [convIdStr]: messages },
      hasMoreMessages: { ...s.hasMoreMessages, [convIdStr]: hasMore },
      messageOffsets: { ...s.messageOffsets, [convIdStr]: offset },
      isLoadingMessages: false,
    }));
  };

  prependMessages = (conversationId: string | number, olderMessages: Message[], hasMore: boolean, offset: number) => {
    const convIdStr = String(conversationId);
    this.setState((s) => {
      const current = s.messagesByConvId[convIdStr] || [];
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convIdStr]: [...olderMessages, ...current]
        },
        hasMoreMessages: { ...s.hasMoreMessages, [convIdStr]: hasMore },
        messageOffsets: { ...s.messageOffsets, [convIdStr]: offset },
        isLoadingMoreMessages: false,
      };
    });
  };

  /** Add a single new message (from WebSocket or after sending) */
  pushMessage = (conversationId: string | number, message: Message) => {
    const convIdStr = String(conversationId);
    this.setState((s) => {
      // IMPORTANT: If we haven't fetched the full history for this chat yet,
      // do NOT create an array with just 1 message. Otherwise, Inbox.tsx
      // will assume the history is loaded and never fetch the older messages.
      if (!s.messagesByConvId[convIdStr]) {
        return {};
      }

      const existing = s.messagesByConvId[convIdStr];
      // Avoid duplicates (WS + REST could both fire)
      if (existing.find((m) => String(m.id) === String(message.id))) return {};

      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convIdStr]: [...existing, message],
        },
      };
    });
  };

  /** Remove a message from the local store */
  removeMessage = (conversationId: string | number, messageId: string | number) => {
    const convIdStr = String(conversationId);
    this.setState((s) => {
      if (!s.messagesByConvId[convIdStr]) return {};
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convIdStr]: s.messagesByConvId[convIdStr].filter(m => String(m.id) !== String(messageId)),
        },
      };
    });
  };

  /** Update an existing message in the local store */
  updateMessage = (conversationId: string | number, messageId: string | number, patch: Partial<Message>) => {
    const convIdStr = String(conversationId);
    this.setState((s) => {
      if (!s.messagesByConvId[convIdStr]) return {};
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convIdStr]: s.messagesByConvId[convIdStr].map((m) =>
            String(m.id) === String(messageId) || m.wa_message_id === String(messageId)
              ? { ...m, ...patch }
              : m
          ),
        },
      };
    });
  };



  /** Update conversation's last_message preview + unread count */
  updateConversationMeta = (conversationId: string | number, patch: Partial<Conversation>) => {
    const convIdStr = String(conversationId);
    this.setState((s) => {
      let needsSort = false;
      const updatedConversations = s.conversations.map((c) => {
        if (String(c.id) === convIdStr) {
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

  markRead = (conversationId: string | number) => {
    this.updateConversationMeta(conversationId, { unread_count: 0 });
  };

  updateStatus = (conversationId: string | number, status: Conversation['status']) => {
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
