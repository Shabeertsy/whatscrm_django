import { apiClient } from './client';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    return apiClient.post('/accounts/login/', credentials);
  },
  
  // Future auth endpoints can go here:
  // logout, refresh token, change password, etc.
};
