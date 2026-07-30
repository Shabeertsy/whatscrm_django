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
  frequency?: "once" | "daily" | "weekly" | "monthly" | "custom";
  custom_days_gap?: number | null;
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

export const fetchCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.get(`/campaigns/${id}/`);
  return response.data;
};

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_delivered: number;
  avg_read_rate: number;
}

export const fetchCampaignStats = async (): Promise<CampaignStats> => {
  const response = await apiClient.get(`/campaigns/stats/`);
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

export interface CampaignDelivery {
  id: number;
  campaign: string;
  contact: string;
  contact_details: {
    id: string;
    name: string;
    phone: string;
    wa_id: string;
  };
  run_id: string;
  status: "pending" | "sent" | "failed" | "skipped";
  error: string;
  sent_at: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const fetchCampaignDeliveries = async (id: string, page: number = 1): Promise<PaginatedResponse<CampaignDelivery>> => {
  const response = await apiClient.get(`/campaigns/${id}/deliveries/?page=${page}`);
  return response.data;
};
