import React, { useState, useEffect } from "react";
import PageHeader from "../../components/shared/PageHeader";
import AgentConfig from "./components/AgentConfig";
import AgentTesting from "./components/AgentTesting";
import { defaultAgentConfig, AiAgentConfig, fetchAiAgentConfig, updateAiAgentConfig, createAiAgentConfig, fetchAiProviders, AiProviderConfig } from "../../api/ai";
import { Save } from "lucide-react";
import toast from "react-hot-toast";


export function AiAgent() {
  const [config, setConfig] = useState<AiAgentConfig>(defaultAgentConfig);
  const [file, setFile] = useState<File | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [providers, setProviders] = useState<AiProviderConfig[]>([]);

  useEffect(() => {
    Promise.all([fetchAiAgentConfig(), fetchAiProviders()]).then(([agentData, providerData]) => {
      setConfig(agentData);
      setProviders(providerData);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      toast.error("Failed to fetch AI config");
      setIsLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (config.id) {
        const data = await updateAiAgentConfig(config.id, config, file);
        setConfig(data);
      } else {
        const data = await createAiAgentConfig(config, file);
        setConfig(data);
      }
      toast.success("AI Agent settings saved!");
      setFile(undefined); // Reset file after save
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6 min-w-0 transition duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="AI Responder Agent"
          description="Configure systemic LLM parameters, temperature, system prompts, and test the outputs in real-time."
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-[#007e3a] hover:bg-[#00662f] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AgentConfig config={config} providers={providers} onChange={setConfig} onFileChange={setFile} />
        </div>
        <div className="xl:col-span-1">
          <AgentTesting config={config} />
        </div>
      </div>
    </div>
  );
}

export default AiAgent;
