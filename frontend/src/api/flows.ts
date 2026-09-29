import { apiClient } from "./client";

export const flowsApi = {
  listFlows: () => apiClient.get("/flows/"),
  getFlow: (id: string) => apiClient.get(`/flows/${id}/`),
  createFlow: (data: any) => apiClient.post("/flows/", data),
  updateFlow: (id: string, data: any) => apiClient.put(`/flows/${id}/`, data),
  deleteFlow: (id: string) => apiClient.delete(`/flows/${id}/`),
  publishFlow: (id: string) => apiClient.post(`/flows/${id}/publish/`),
  syncFlow: (id: string) => apiClient.post(`/flows/${id}/sync/`),
  previewApi: (cfg: object) => apiClient.post("/flows/preview-api/", cfg),
};
