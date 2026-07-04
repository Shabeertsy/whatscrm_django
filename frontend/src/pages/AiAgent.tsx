import React, { useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import AgentConfig from "../features/ai/AgentConfig";
import AgentTesting from "../features/ai/AgentTesting";
import { defaultAgentConfig, AiAgentConfig } from "../features/ai/api";

export function AiAgent() {
  const [config, setConfig] = useState<AiAgentConfig>(defaultAgentConfig);

  return (
    <div className="space-y-6 min-w-0 transition duration-200">
      <PageHeader
        title="AI Responder Agent"
        description="Configure systemic LLM parameters, temperature, system prompts, and test the outputs in real-time."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentConfig config={config} onChange={setConfig} />
        <AgentTesting config={config} />
      </div>
    </div>
  );
}

export default AiAgent;
