import { Deal, Pipeline, PipelineStage, PipelineField } from '../pipeline/api';

export type TimeframeOption = 'all' | 'daily' | 'weekly' | 'monthly';

export interface PipelineTableFiltersState {
  search: string;
  pipelineId: string;
  stageId: string;
  timeframe: TimeframeOption;
}

export interface PipelineTableStatsData {
  totalDeals: number;
  totalValue: number;
  confirmedCount: number;
  avgDealValue: number;
}

export interface ExtraFieldColumn {
  key: string;
  label: string;
}

export interface DealFormData {
  id?: string;
  name: string;
  value: number;
  pipeline?: string;
  stage?: string;
  wa_contact?: string | null;
  manual_contact?: string | null;
  note?: string | null;
  extra_data?: Record<string, any>;
  assigned_agent?: string | null;
}
