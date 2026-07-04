import { apiClient } from './client';

export const hotelsApi = {
  getHotels: async (params?: Record<string, any>) => {
    return apiClient.get('/core/hotels/', { params });
  },
  getRooms: async (params: Record<string, any>) => {
    return apiClient.get('/core/rooms/', { params });
  },
};
