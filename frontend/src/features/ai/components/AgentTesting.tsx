import React, { useState } from "react";
import { Send, Terminal } from "lucide-react";
import { AiAgentConfig, testAiAgent } from "../../../api/ai";


interface AgentTestingProps {
  config: AiAgentConfig;
}

interface TestMessage {
  sender: "user" | "agent";
  text: string;
}

const formatWhatsAppText = (text: string) => {
  if (!text) return "";
  let formatted = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
  formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>');
  formatted = formatted.replace(/\n/g, '<br />');
  return formatted;
};

export function AgentTesting({ config }: AgentTestingProps) {
  const [messages, setMessages] = useState<TestMessage[]>([
    { sender: "agent", text: "Hello! I am ready to test your system instructions. How can I help you today?" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal;
    const newMessages = [...messages, { sender: "user" as const, text: userMsg }];
    setMessages(newMessages);
    setInputVal("");
    setIsTyping(true);

    try {
      const response = await testAiAgent(newMessages, config);
      setIsTyping(false);
      if (response.error) {
        setMessages((prev) => [...prev, { sender: "agent", text: `[Error] ${response.error}` }]);
      } else {
        setMessages((prev) => [...prev, { sender: "agent", text: response.reply }]);
      }
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [...prev, { sender: "agent", text: "[Error] Failed to connect to the agent API." }]);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-sm transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#007e3a] to-[#00b050] flex items-center justify-center text-white shadow-sm shadow-[#007e3a]/20">
              <Terminal className="h-5 w-5" />
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">Live Sandbox</h3>
            <p className="text-[11px] text-slate-500 font-medium">Test Agent Configuration</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-900/30">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
              m.sender === "user" 
                ? "bg-[#007e3a] text-white rounded-tr-sm" 
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm"
            }`}>
              <div 
                className="font-medium leading-relaxed" 
                dangerouslySetInnerHTML={{ __html: formatWhatsAppText(m.text) }} 
              />
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex space-x-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask a test question..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full pl-5 pr-12 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]/30 transition-all"
          />
          <button 
            type="submit" 
            disabled={!inputVal.trim() || isTyping}
            className="absolute right-2 p-2 bg-[#007e3a] hover:bg-[#00662f] disabled:opacity-50 disabled:hover:bg-[#007e3a] text-white rounded-full transition-colors flex items-center justify-center shadow-sm"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AgentTesting;
