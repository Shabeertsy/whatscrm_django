import { apiClient } from './client';
import type { WhatsappInstance } from '../types/whatsapp';

export interface CreateScannedInstanceResponse {
  instance: WhatsappInstance;
  qr_code: string;
  status: string;
}

export interface InstanceQRResponse {
  id: string;
  qr_code: string;
  status: string;
  is_active: boolean;
}

export interface InstanceStatusResponse {
  id: string;
  status: string;
  is_active: boolean;
  phone?: string;
  has_qr: boolean;
}

export const evolutionApi = {
  /** Creates a new physical scanned device instance and gets the initial QR code */
  createScannedInstance: (displayName: string) =>
    apiClient.post<CreateScannedInstanceResponse>('/evolution/instances/', {
      display_name: displayName,
    }),

  /** Fetches / refreshes the QR code for a scanned device instance */
  getInstanceQR: (instanceId: string) =>
    apiClient.get<InstanceQRResponse>(`/evolution/instances/${instanceId}/qr/`),

  /** Polls current connection state (open, close, connecting) */
  getInstanceStatus: (instanceId: string) =>
    apiClient.get<InstanceStatusResponse>(`/evolution/instances/${instanceId}/status/`),

  /** Disconnects existing session and generates a fresh QR code for re-linking */
  rescanInstance: (instanceId: string) =>
    apiClient.post<InstanceQRResponse>(`/evolution/instances/${instanceId}/rescan/`),

  /** Logs out and disconnects the physical WhatsApp session */
  disconnectInstance: (instanceId: string) =>
    apiClient.post<{ id: string; status: string; is_active: boolean }>(
      `/evolution/instances/${instanceId}/disconnect/`
    ),

  /** Syncs / re-syncs chats and messages from Evolution API for this instance */
  syncInstanceChats: (instanceId: string) =>
    apiClient.post<{ id: string; imported_messages: number; status: string }>(
      `/evolution/instances/${instanceId}/sync/`
    ),
};

