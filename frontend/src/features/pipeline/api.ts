import { apiClient } from "../../api/client";

export interface PipelineStage {
  id: string;
  title: string;
  color?: string;
  order: number;
  is_confirmed: boolean;
  extra_fields: StageField[];
}

// Dynamic extra field definition for pipeline deals
export interface PipelineField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}
export type StageField = PipelineField;

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  auto_create_deals: boolean;
  extra_fields?: PipelineField[];
  stages: PipelineStage[];
  deal_count: number;
}

export interface DealAssignedUser {
  id: string;
  name: string;
  email?: string;
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  pipeline: string;
  stage: string;
  wa_contact?: string | null;
  manual_contact?: string | null;
  contact_name?: string;
  contact_phone?: string;
  note?: string | null;
  extra_data?: Record<string, any>;

  // Chat date & user assignment
  chat_started_at?: string | null;
  assigned_user?: DealAssignedUser | null;
  conversation_id?: string | null;

  // Confirmed booking snapshot fields 
  is_confirmed_booking?: boolean;
  confirmed_at?: string | null;
  confirmed_stage_title?: string;
  confirmed_pipeline_name?: string;
  created_at?: string;
}

export interface ConfirmedBooking extends Deal {
  deal_name?: string;
  stage_title?: string;
  pipeline_name?: string;
  is_confirmed_booking: true;
  confirmed_at: string;
  confirmed_stage_title: string;
  confirmed_pipeline_name: string;
  updated_at?: string;
}

// Pipeline APIs 

export const getPipelines = async (): Promise<Pipeline[]> => {
  const res = await apiClient.get('/contacts/pipelines/');
  return res.data;
};

export const createPipeline = async (data: { name: string; description?: string; extra_fields?: PipelineField[] }): Promise<Pipeline> => {
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


// Stage APIs 

export const getStages = async (pipelineId?: string): Promise<PipelineStage[]> => {
  const params = pipelineId ? { pipeline: pipelineId } : {};
  const res = await apiClient.get('/contacts/pipeline/stages/', { params });
  return res.data;
};

export const createStage = async (pipelineId: string, data: { title: string; color?: string; order?: number; is_confirmed?: boolean; extra_fields?: StageField[] }): Promise<PipelineStage> => {
  const res = await apiClient.post('/contacts/pipeline/stages/', { ...data, pipeline: pipelineId });
  return res.data;
};

export const updateStage = async (id: string, data: Partial<PipelineStage>): Promise<PipelineStage> => {
  const res = await apiClient.patch(`/contacts/pipeline/stages/${id}/`, data);
  return res.data;
};

// Delete stage — backend renormalizes remaining orders and returns them
export const deleteStage = async (id: string): Promise<PipelineStage[]> => {
  const res = await apiClient.delete(`/contacts/pipeline/stages/${id}/`);
  return res.data;
};

// Atomically swap orders of two stages
export const swapStages = async (stageAId: string, stageBId: string): Promise<{ stage_a: PipelineStage; stage_b: PipelineStage }> => {
  const res = await apiClient.post('/contacts/pipeline/stages/swap/', { stage_a: stageAId, stage_b: stageBId });
  return res.data;
};


// Deal APIs 

export interface PaginatedDealsResult {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: Deal[];
  total_value?: number;
  confirmed_count?: number;
}

export const getDeals = async (pipelineId: string, timeframe?: string): Promise<Deal[]> => {
  const params: any = { pipeline: pipelineId };
  if (timeframe) {
    params.timeframe = timeframe;
  }
  const res = await apiClient.get('/contacts/pipeline/deals/', { params });
  return Array.isArray(res.data) ? res.data : res.data.results || [];
};

export const getPaginatedDeals = async (params: {
  pipeline: string;
  page?: number;
  page_size?: number;
  stage?: string;
  search?: string;
  timeframe?: string;
}): Promise<PaginatedDealsResult> => {
  const queryParams: Record<string, any> = {
    pipeline: params.pipeline,
    paginate: 'true',
    page: params.page || 1,
    page_size: params.page_size || 10,
  };
  if (params.stage && params.stage !== 'all') queryParams.stage = params.stage;
  if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params.timeframe && params.timeframe !== 'all') queryParams.timeframe = params.timeframe;

  const res = await apiClient.get('/contacts/pipeline/deals/', { params: queryParams });
  return res.data;
};

export const createDeal = async (data: {
  name: string;
  value: number;
  pipeline?: string;
  stage?: string;
  wa_contact?: string | null;
  manual_contact?: string | null;
  note?: string | null;
  extra_data?: Record<string, any>;
  assigned_agent?: string | null;
}): Promise<Deal> => {
  const res = await apiClient.post('/contacts/pipeline/deals/', data);
  return res.data;
};

export const updateDeal = async (id: string, data: Partial<Deal> & { assigned_agent?: string | null }): Promise<Deal> => {
  const res = await apiClient.patch(`/contacts/pipeline/deals/${id}/`, data);
  return res.data;
};

export const deleteDeal = async (id: string): Promise<void> => {
  await apiClient.delete(`/contacts/pipeline/deals/${id}/`);
};

export const getDeal = async (id: string): Promise<Deal> => {
  const res = await apiClient.get(`/contacts/pipeline/deals/${id}/`);
  return res.data;
};


export interface PaginatedConfirmedBookingsResult {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: ConfirmedBooking[];
  total_value?: number;
}

export const getConfirmedBookings = async (): Promise<ConfirmedBooking[]> => {
  const res = await apiClient.get('/contacts/pipeline/deals/confirmed/');
  return Array.isArray(res.data) ? res.data : res.data.results || [];
};

export const getPaginatedConfirmedBookings = async (params: {
  page?: number;
  page_size?: number;
  pipeline?: string;
  search?: string;
}): Promise<PaginatedConfirmedBookingsResult> => {
  const queryParams: Record<string, any> = {
    paginate: 'true',
    page: params.page || 1,
    page_size: params.page_size || 10,
  };
  if (params.pipeline && params.pipeline !== 'all') queryParams.pipeline = params.pipeline;
  if (params.search && params.search.trim()) queryParams.search = params.search.trim();

  const res = await apiClient.get('/contacts/pipeline/deals/confirmed/', { params: queryParams });
  return res.data;
};


export const updateConfirmedBooking = async (
  id: string,
  data: {
    name?: string;
    deal_name?: string;
    value?: number;
    contact_name?: string;
    contact_phone?: string;
    note?: string;
    extra_data?: Record<string, any>;
  }
): Promise<ConfirmedBooking> => {
  const res = await apiClient.patch(`/contacts/pipeline/deals/confirmed/${id}/`, data);
  return res.data;
};

export const deleteConfirmedBooking = async (id: string): Promise<void> => {
  await apiClient.delete(`/contacts/pipeline/deals/confirmed/${id}/`);
};
