import { apiClient } from '../../api/client';

export interface Campaign {
  id: string;
  name: string;
  status: "Running" | "Paused" | "Completed" | "Draft";
  template_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  target_type?: "all" | "specific";
  contacts?: string[];
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  tags?: string[];
  created_at?: string;
}

export const fetchCampaigns = async (): Promise<Campaign[]> => {
  const response = await apiClient.get(`/campaigns/`);
  return response.data;
};

export const createCampaign = async (data: Partial<Campaign>): Promise<Campaign> => {
  const response = await apiClient.post(`/campaigns/`, data);
  return response.data;
};

export const launchCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.post(`/campaigns/${id}/launch/`, {});
  return response.data;
};

export const stopCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.post(`/campaigns/${id}/stop/`, {});
  return response.data;
};

export const updateCampaign = async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
  const response = await apiClient.patch(`/campaigns/${id}/`, data);
  return response.data;
};

export const deleteCampaign = async (id: string): Promise<void> => {
  await apiClient.delete(`/campaigns/${id}/`);
};
