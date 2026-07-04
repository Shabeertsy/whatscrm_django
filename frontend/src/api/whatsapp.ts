import { apiClient } from './client';
import type { WhatsappInstance, WhatsappInstancePayload } from '../types/whatsapp';

export const whatsappApi = {
  listInstances: () =>
    apiClient.get<WhatsappInstance[]>('/whatsapp/instances/'),

  getInstance: (id: string) =>
    apiClient.get<WhatsappInstance>(`/whatsapp/instances/${id}/`),

  createInstance: (payload: WhatsappInstancePayload) =>
    apiClient.post<WhatsappInstance>('/whatsapp/instances/', payload),

  updateInstance: (id: string, payload: Partial<WhatsappInstancePayload>) =>
    apiClient.patch<WhatsappInstance>(`/whatsapp/instances/${id}/`, payload),

  deleteInstance: (id: string) =>
    apiClient.delete(`/whatsapp/instances/${id}/`),

  toggleActive: (id: string) =>
    apiClient.post<{ id: string; is_active: boolean }>(
      `/whatsapp/instances/${id}/toggle-active/`
    ),
};
