import { apiClient } from "../../api/client";

export interface PipelineStage {
  id: string;
  title: string;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  auto_create_deals: boolean;
  stages: PipelineStage[];
  deal_count: number;
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  pipeline: string;
  stage: string;
  wa_contact?: string | null;
  contact_name?: string;
  contact_phone?: string;
  note?: string | null;
}

// ─── Pipeline APIs ──────────────────────────────────────────────────────────

export const getPipelines = async (): Promise<Pipeline[]> => {
  const res = await apiClient.get('/contacts/pipelines/');
  return res.data;
};

export const createPipeline = async (data: { name: string; description?: string }): Promise<Pipeline> => {
  const res = await apiClient.post('/contacts/pipelines/', data);
  return res.data;
};

export const updatePipeline = async (id: string, data: Partial<Pipeline>): Promise<Pipeline> => {
  const res = await apiClient.patch(`/contacts/pipelines/${id}/`, data);
  return res.data;
};

export const deletePipeline = async (id: string): Promise<void> => {
  await apiClient.delete(`/contacts/pipelines/${id}/`);
};

export const activatePipeline = async (id: string): Promise<Pipeline> => {
  const res = await apiClient.post(`/contacts/pipelines/${id}/activate/`);
  return res.data;
};

// ─── Stage APIs ─────────────────────────────────────────────────────────────

export const getStages = async (pipelineId: string): Promise<PipelineStage[]> => {
  const res = await apiClient.get('/contacts/pipeline/stages/', { params: { pipeline: pipelineId } });
  return res.data;
};

export const createStage = async (pipelineId: string, data: { title: string; order?: number }): Promise<PipelineStage> => {
  const res = await apiClient.post('/contacts/pipeline/stages/', { ...data, pipeline: pipelineId });
  return res.data;
};

// ─── Deal APIs ───────────────────────────────────────────────────────────────

export const getDeals = async (pipelineId: string): Promise<Deal[]> => {
  const res = await apiClient.get('/contacts/pipeline/deals/', { params: { pipeline: pipelineId } });
  return res.data;
};

export const createDeal = async (data: {
  name: string;
  value: number;
  pipeline?: string;
  stage?: string;
  wa_contact?: string | null;
  note?: string | null;
}): Promise<Deal> => {
  const res = await apiClient.post('/contacts/pipeline/deals/', data);
  return res.data;
};

export const updateDeal = async (id: string, data: Partial<Deal>): Promise<Deal> => {
  const res = await apiClient.patch(`/contacts/pipeline/deals/${id}/`, data);
  return res.data;
};

export const deleteDeal = async (id: string): Promise<void> => {
  await apiClient.delete(`/contacts/pipeline/deals/${id}/`);
};
