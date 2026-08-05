import { apiClient } from "../../api/client";

export interface Metric {
  label: string;
  val: string;
  desc: string;
  success: boolean;
}

export interface SystemLog {
  time: string;
  type: "success" | "info" | "warning";
  text: string;
  timestamp: string;
}

export const getMetrics = async (): Promise<Metric[]> => {
  const res = await apiClient.get('/core/dashboard/metrics/');
  return res.data;
};

export const getSystemLogs = async (): Promise<SystemLog[]> => {
  const res = await apiClient.get('/core/dashboard/logs/');
  return res.data;
};
