import { apiClient as client } from "./client";
import { Flow } from "../features/automation/api";

export const automationApi = {
  getFlows: async (): Promise<Flow[]> => {
    const response = await client.get("/automation/flows/");
    return response.data;
  },

  getFlow: async (id: string): Promise<Flow> => {
    const response = await client.get(`/automation/flows/${id}/`);
    return response.data;
  },

  createFlow: async (data: Partial<Flow>): Promise<Flow> => {
    const response = await client.post("/automation/flows/", data);
    return response.data;
  },

  updateFlow: async (id: string, data: Partial<Flow>): Promise<Flow> => {
    const response = await client.put(`/automation/flows/${id}/`, data);
    return response.data;
  },

  deleteFlow: async (id: string): Promise<void> => {
    await client.delete(`/automation/flows/${id}/`);
  },

  activateFlow: async (id: string): Promise<{ status: string; flow_status: string }> => {
    const response = await client.post(`/automation/flows/${id}/activate/`);
    return response.data;
  },

  pauseFlow: async (id: string): Promise<{ status: string; flow_status: string }> => {
    const response = await client.post(`/automation/flows/${id}/pause/`);
    return response.data;
  }
};
