import React, { useState } from "react";
import { Bot, Sliders } from "lucide-react";
import { AiAgentConfig } from "./api";

interface AgentConfigProps {
  config: AiAgentConfig;
  onChange: (updated: AiAgentConfig) => void;
}

export function AgentConfig({ config, onChange }: AgentConfigProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-808 rounded-xl p-5 shadow-sm space-y-4 transition duration-200">
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <Bot className="h-5 w-5 text-[#007e3a]" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">AI Agent Settings</h3>
      </div>

      <div>
        <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Agent Name</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => onChange({ ...config, name: e.target.value })}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-808 text-slate-850 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
        />
      </div>

      <div>
        <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Large Language Model</label>
        <select
          value={config.model}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="gpt-4o">GPT-4o (Recommended)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="llama-3.1-70b">Llama 3.1 70B (Meta)</option>
          <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">System Instructions / Base Prompt</label>
        <textarea
          value={config.systemPrompt}
          onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
          rows={5}
          placeholder="Instruct the bot on how it should greet customers, gather lead info, and close deals..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a]"
        />
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <div className="flex justify-between text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">
            <span>Creativity (Temperature)</span>
            <span className="font-extrabold text-[#007e3a]">{config.temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full accent-[#007e3a]"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">
            <span>Response Delay (Seconds)</span>
            <span className="font-extrabold text-[#007e3a]">{config.autoReplyDelay}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={config.autoReplyDelay}
            onChange={(e) => onChange({ ...config, autoReplyDelay: parseInt(e.target.value) })}
            className="w-full accent-[#007e3a]"
          />
        </div>
      </div>
    </div>
  );
}

export default AgentConfig;
