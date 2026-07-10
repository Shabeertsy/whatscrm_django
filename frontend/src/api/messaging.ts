
import { apiClient } from './client';

const BASE = '/messaging';

// Types 
export interface ContactMin {
  id: string;
  wa_id: string;
  phone: string;
  name: string;
  profile_pic_url: string;
  is_saved: boolean;
  tags: string[];
}

export interface LastMessage {
  body: string;
  direction: 'inbound' | 'outbound';
  msg_type: string;
  media_url?: string;
  related_room_uuid?: string | null;
}

export interface Conversation {
  id: string;
  contact: ContactMin;
  instance: string | null;
  instance_name: string | null;
  assigned_agent: string | null;
  agent_name: string | null;
  status: 'open' | 'pending' | 'resolved' | 'snoozed';
  unread_count: number;
  last_message: LastMessage | null;
  last_message_at: string | null;
  last_inbound_at: string | null;
}

export interface Message {
  id: string;
  conversation: string;
  wa_message_id: string;
  direction: 'inbound' | 'outbound';
  msg_type: string;
  body: string;
  media_url: string;
  related_room_uuid?: string | null;
  replied_to_message?: {
    id: string;
    body: string;
    msg_type: string;
    media_url?: string;
    sent_by_name: string | null;
  } | null;
  sent_by: string | null;
  sent_by_name: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

//  API Functions 
export const messagingApi = {
  /** List conversations — optionally filter by status */
  listConversations(params?: { status?: string; search?: string }) {
    return apiClient.get<Conversation[]>(`${BASE}/conversations/`, { params });
  },

  /** Load full conversation with messages */
  getConversation(id: string) {
    return apiClient.get<ConversationDetail>(`${BASE}/conversations/${id}/`);
  },

  /** Send an outbound message */
  sendMessage(conversationId: string, payload: { body?: string; msg_type?: string; media_url?: string; related_room_uuid?: string | null; reply_to_message_id?: string | null }) {
    return apiClient.post<Message>(`${BASE}/conversations/${conversationId}/send/`, payload);
  },

  /** Mark conversation as read (reset unread_count) */
  markRead(conversationId: string) {
    return apiClient.post(`${BASE}/conversations/${conversationId}/mark-read/`);
  },

  /** Delete a message */
  deleteMessage(messageId: string) {
    return apiClient.delete(`${BASE}/messages/${messageId}/`);
  },

  /** Update conversation status */
  updateStatus(conversationId: string, status: string) {
    return apiClient.patch(`${BASE}/conversations/${conversationId}/`, { status });
  },

  /** Save a ghost contact as a real contact */
  saveContact(contactId: string, name: string, tags: string[] = []) {
    return apiClient.post(`${BASE}/contacts/${contactId}/save/`, { name, tags, source: 'manual' });
  },

  /** Upload media to backend and get URL */
  uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ url: string; type: string; filename: string }>(`${BASE}/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
