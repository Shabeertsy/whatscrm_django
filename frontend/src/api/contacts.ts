import { apiClient } from './client';

export const contactsApi = {
  // Contacts
  getContacts: (params?: Record<string, any>) =>
    apiClient.get('/contacts/', { params }),

  createContact: (data: Record<string, any>) =>
    apiClient.post('/contacts/', data),

  updateContact: (id: string, data: Record<string, any>) =>
    apiClient.put(`/contacts/${id}/`, data),

  deleteContact: (id: string) =>
    apiClient.delete(`/contacts/${id}/`),

  // Tags
  getTags: () =>
    apiClient.get('/contacts/tags/'),

  createTag: (data: { name: string; color?: string }) =>
    apiClient.post('/contacts/tags/', data),

  updateTag: (id: string, data: { name?: string; color?: string }) =>
    apiClient.put(`/contacts/tags/${id}/`, data),

  deleteTag: (id: string) =>
    apiClient.delete(`/contacts/tags/${id}/`),

  // WhatsApp import
  getWAContacts: () =>
    apiClient.get('/contacts/wa-contacts/'),

  importWAContacts: (wa_ids: string[]) =>
    apiClient.post('/contacts/wa-import/', { wa_ids }),
};
