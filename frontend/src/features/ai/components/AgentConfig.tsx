import { Bot, Sliders } from "lucide-react";
import { AiAgentConfig, AiProviderConfig } from "../../../api/ai";


interface AgentConfigProps {
  config: AiAgentConfig;
  providers: AiProviderConfig[];
  onChange: (updated: AiAgentConfig) => void;
  onFileChange: (file: File | undefined) => void;
}

const modelOptions: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  claude: ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  gemini: ["gemini-1.5-pro", "gemini-1.5-flash"],
};

export function AgentConfig({ config, providers, onChange, onFileChange }: AgentConfigProps) {
  // Find currently selected provider
  const selectedProvider = providers.find(p => p.id === config.provider);
  const currentProviderType = selectedProvider?.ai_provider_name || 'openai';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-xl p-5 shadow-sm space-y-4 transition duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-[#007e3a]" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">AI Agent Settings</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {config.is_active ? 'AI Enabled' : 'AI Disabled'}
          </span>
          <button
            onClick={() => onChange({ ...config, is_active: !config.is_active })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${config.is_active ? 'bg-[#007e3a]' : 'bg-slate-300 dark:bg-slate-600'}`}
            title={config.is_active ? "Disable AI Agent Globally" : "Enable AI Agent Globally"}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${config.is_active ? 'translate-x-4.5 translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left Column: Core Setup */}
        <div className="space-y-5">
          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1.5">Agent Name</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1.5">Provider Settings</label>
            {providers.length === 0 ? (
              <p className="text-xs text-red-500">Please configure AI Providers in Settings first.</p>
            ) : (
              <select
                value={config.provider || ""}
                onChange={(e) => {
                  const newProviderId = e.target.value;
                  const newProviderObj = providers.find(p => p.id === newProviderId);
                  const newProviderName = newProviderObj?.ai_provider_name || 'openai';
                  
                  onChange({ 
                    ...config, 
                    provider: newProviderId,
                    model_name: modelOptions[newProviderName]?.[0] || ""
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors"
              >
                <option value="" disabled>Select a configured provider...</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.ai_provider_name.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1.5">Large Language Model</label>
            <div className="flex gap-2">
              <select
                value={(modelOptions[currentProviderType] || []).includes(config.model_name) ? config.model_name : "custom"}
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    onChange({ ...config, model_name: e.target.value });
                  } else {
                    onChange({ ...config, model_name: "" });
                  }
                }}
                className={`${!(modelOptions[currentProviderType] || []).includes(config.model_name) ? 'w-[45%]' : 'w-full'} bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors`}
              >
                {(modelOptions[currentProviderType] || []).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
                <option value="custom">Custom...</option>
              </select>
              {!(modelOptions[currentProviderType] || []).includes(config.model_name) && (
                <input
                  type="text"
                  value={config.model_name}
                  onChange={(e) => onChange({ ...config, model_name: e.target.value })}
                  placeholder="Type custom model name..."
                  className="w-[55%] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors"
                />
              )}
            </div>
          </div>
          
          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1.5">Knowledge Base (File Upload)</label>
            {config.knowledge_base && (
              <p className="text-xs mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                Current file: <a href={config.knowledge_base} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">View Document</a>
              </p>
            )}
            <input
              type="file"
              onChange={(e) => onFileChange(e.target.files?.[0])}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#007e3a] file:text-white hover:file:bg-[#00602d]"
            />
          </div>
        </div>

        {/* Right Column: Behavior */}
        <div className="space-y-6">
          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1.5">System Instructions / Base Prompt</label>
            <textarea
              value={config.system_prompt}
              onChange={(e) => onChange({ ...config, system_prompt: e.target.value })}
              placeholder="Instruct the bot on how it should greet customers, gather lead info, and close deals..."
              className="w-full min-h-[280px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-2">
                <span>Creativity</span>
                <span className="font-extrabold text-[#007e3a] bg-[#007e3a]/10 px-1.5 py-0.5 rounded">{config.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full accent-[#007e3a] h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-2">
                <span>Response Delay</span>
                <span className="font-extrabold text-[#007e3a] bg-[#007e3a]/10 px-1.5 py-0.5 rounded">{config.auto_reply_delay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={config.auto_reply_delay}
                onChange={(e) => onChange({ ...config, auto_reply_delay: parseInt(e.target.value) })}
                className="w-full accent-[#007e3a] h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentConfig;
