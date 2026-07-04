export interface AiAgentConfig {
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  autoReplyDelay: number;
}

export const defaultAgentConfig: AiAgentConfig = {
  name: "WhatSaas Assistant Agent",
  model: "gpt-4o",
  systemPrompt: "You are a professional customer support representative for Acme SaaS. Answer questions politely and assist them with booking demos or upgrading subscriptions.",
  temperature: 0.7,
  autoReplyDelay: 2
};
