import { apiClient } from './client';

export const hotelsApi = {
  getCrmRooms: async (params?: Record<string, any>) => {
    return apiClient.get('/core/crm-rooms/', { params });
  },
  getCrmRoomDetail: async (uuid: string, params?: Record<string, any>) => {
    return apiClient.get(`/core/crm-rooms/${uuid}/`, { params });
  },
  getRoomConfig: async () => {
    return apiClient.get('/core/room-config/');
  },
  getPropertyConfig: async () => {
    return apiClient.get('/core/property-config/');
  }
};
