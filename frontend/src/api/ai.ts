import { apiClient } from "./client";

export interface AiAgentConfig {
  id?: string;
  name: string;
  provider: string | null;
  model_name: string;
  system_prompt: string;
  temperature: number;
  auto_reply_delay: number;
  is_active: boolean;
  knowledge_base?: string | null;
}

export const defaultAgentConfig: AiAgentConfig = {
  name: "WhatSaas Assistant Agent",
  provider: null,
  model_name: "gpt-4o",
  system_prompt: "You are a professional customer support representative for Acme SaaS. Answer questions politely and assist them with booking demos or upgrading subscriptions.",
  temperature: 0.7,
  auto_reply_delay: 2,
  is_active: true
};

export const fetchAiAgentConfig = async (): Promise<AiAgentConfig> => {
  const { data } = await apiClient.get("/ai/ai-agents/");
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  if (data.results && data.results.length > 0) {
    return data.results[0];
  }
  return defaultAgentConfig;
};

export const updateAiAgentConfig = async (id: string, config: Partial<AiAgentConfig>, file?: File): Promise<AiAgentConfig> => {
  if (file) {
    const formData = new FormData();
    Object.entries(config).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append("knowledge_base", file);
    const { data } = await apiClient.patch(`/ai/ai-agents/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  }
  
  const { data } = await apiClient.patch(`/ai/ai-agents/${id}/`, config);
  return data;
};

export const createAiAgentConfig = async (config: Omit<AiAgentConfig, "id">, file?: File): Promise<AiAgentConfig> => {
  if (file) {
    const formData = new FormData();
    Object.entries(config).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append("knowledge_base", file);
    const { data } = await apiClient.post("/ai/ai-agents/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  }
  
  const { data } = await apiClient.post("/ai/ai-agents/", config);
  return data;
};

export interface AiProviderConfig {
  id: string;
  name: string;
  ai_provider_name: "openai" | "claude" | "gemini";
  ai_provider_api_key?: string;
  ai_provider_secret_key?: string;
}

export type AiProviderPayload = Omit<AiProviderConfig, "id">;

export const fetchAiProviders = async (): Promise<AiProviderConfig[]> => {
  const { data } = await apiClient.get("/ai/ai-providers/");
  if (Array.isArray(data)) {
    return data;
  }
  return data.results || [];
};

export const createAiProvider = async (payload: AiProviderPayload): Promise<AiProviderConfig> => {
  const { data } = await apiClient.post("/ai/ai-providers/", payload);
  return data;
};

export const updateAiProvider = async (id: string, payload: AiProviderPayload): Promise<AiProviderConfig> => {
  const { data } = await apiClient.patch(`/ai/ai-providers/${id}/`, payload);
  return data;
};

export const deleteAiProvider = async (id: string): Promise<void> => {
  await apiClient.delete(`/ai/ai-providers/${id}/`);
};
