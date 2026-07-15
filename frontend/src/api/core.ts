import { apiClient } from './client';

export interface ProxyURL {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

export interface ProxyURLPayload {
  name: string;
  url: string;
  is_active?: boolean;
}

export const coreApi = {
  // Proxy URLs
  listProxyURLs: () => apiClient.get<ProxyURL[]>('/core/proxy-urls/'),
  createProxyURL: (payload: ProxyURLPayload) => apiClient.post<ProxyURL>('/core/proxy-urls/', payload),
  updateProxyURL: (id: string, payload: Partial<ProxyURLPayload>) => apiClient.patch<ProxyURL>(`/core/proxy-urls/${id}/`, payload),
  deleteProxyURL: (id: string) => apiClient.delete(`/core/proxy-urls/${id}/`),
  toggleProxyURLActive: async (id: string) => {
    return apiClient.patch<ProxyURL>(`/core/proxy-urls/${id}/`, { is_active: true });
  }
};
