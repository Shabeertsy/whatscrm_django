import { apiClient } from "../../api/client";

export interface Metric {
  label: string;
  val: string;
  desc: string;
  success: boolean;
}

export async function getMetrics(): Promise<Metric[]> {
  const res = await apiClient.get('/core/dashboard/metrics/');
  return res.data;
}
