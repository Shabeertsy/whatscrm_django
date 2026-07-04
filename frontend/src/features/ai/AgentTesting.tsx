import React, { useState } from "react";
import { Send, Terminal } from "lucide-react";
import { AiAgentConfig } from "./api";

interface AgentTestingProps {
  config: AiAgentConfig;
}

interface TestMessage {
  sender: "user" | "agent";
  text: string;
}

export function AgentTesting({ config }: AgentTestingProps) {
  const [messages, setMessages] = useState<TestMessage[]>([
    { sender: "agent", text: "Hello! I am ready to test your system instructions. How can I help you today?" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal;
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInputVal("");
    setIsTyping(true);

    // Simulate Agent Reply after delay
    setTimeout(() => {
      setIsTyping(false);
      const agentReplyText = `[AI Simulation: ${config.model}] Received instruction to reply based on prompt: "${config.systemPrompt.slice(0, 40)}...". Temperature set to ${config.temperature}.`;
      setMessages((prev) => [...prev, { sender: "agent", text: agentReplyText }]);
    }, config.autoReplyDelay * 1000 || 1000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-202 border-slate-200 dark:border-slate-808 rounded-xl p-5 shadow-sm flex flex-col h-[500px] transition duration-200">
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
        <Terminal className="h-5 w-5 text-[#007e3a]" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Live Agent Sandbox</h3>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs px-3.5 py-2 rounded-lg text-xs ${
              m.sender === "user" ? "bg-[#007e3a] text-white rounded-br-none" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-250 rounded-bl-none"
            }`}>
              <p className="font-medium">{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg rounded-bl-none px-3.5 py-2 text-[10px] font-bold animate-pulse">
              AI Agent is composing reply...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask the AI agent a test question..."
          className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a]"
        />
        <button type="submit" className="p-2 bg-[#007e3a] hover:bg-[#00662f] text-white rounded-lg transition duration-200">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default AgentTesting;
