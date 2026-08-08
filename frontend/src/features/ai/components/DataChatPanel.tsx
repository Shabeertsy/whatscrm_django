import React, { useState, useRef, useEffect, useCallback } from "react";
import { sendDataChatMessage, DataChatMessage } from "../../../api/dataChat";
import {
  X,
  Send,
  Bot,
  Loader2,
  Users,
  GitBranch,
  BarChart3,
  MessageSquare,
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  { icon: Users, label: "How many contacts do I have?" },
  { icon: GitBranch, label: "Show me my pipeline deals" },
  { icon: MessageSquare, label: "How many open conversations?" },
  { icon: BarChart3, label: "Give me a business summary" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith("*") && part.endsWith("*"))
        return <strong key={j} className="font-semibold">{part.slice(1, -1)}</strong>;
      if (part.startsWith("_") && part.endsWith("_"))
        return <em key={j} className="italic">{part.slice(1, -1)}</em>;
      return <span key={j}>{part}</span>;
    });
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

interface DataChatPanelProps {
  onClose: () => void;
  anchorPos?: { x: number; y: number };
}

export function DataChatPanel({ onClose, anchorPos }: DataChatPanelProps) {
  const [messages, setMessages] = useState<DataChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      const userMessage: DataChatMessage = {
        id: generateId(),
        sender: "user",
        text: trimmed,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      const result = await sendDataChatMessage(updatedMessages);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      const aiMessage: DataChatMessage = {
        id: generateId(),
        sender: "ai",
        text: result.reply || "No response generated.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    },
    [messages, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
  };

  if (anchorPos) {
    const panelHeight = 600;
    const panelWidth = 380;
    const padding = 16;

    if (anchorPos.y - panelHeight - padding > 0) {
      panelStyle.top = `${anchorPos.y - panelHeight - 12}px`;
    } else {
      panelStyle.top = `${anchorPos.y + 52 + 12}px`;
    }

    let left = anchorPos.x - panelWidth + 52;
    if (left < padding) left = padding;
    if (left + panelWidth > window.innerWidth - padding) left = window.innerWidth - panelWidth - padding;
    panelStyle.left = `${left}px`;
  } else {
    panelStyle.bottom = "84px";
    panelStyle.right = "24px";
  }

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes typeBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .chat-animate-in {
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .typing-dot {
          animation: typeBounce 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
      `}</style>

      <div
        style={panelStyle}
        className="chat-animate-in flex flex-col w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-120px)] bg-slate-50 rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden font-sans"
      >
        {/* Header  */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[#007e3a] text-white shrink-0 shadow-sm relative z-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm shadow-inner">
            <Bot size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight leading-tight truncate">Data Assistant</h3>
            <p className="text-[12px] text-green-100/90 leading-tight truncate mt-0.5">Query your live CRM data</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-green-100 hover:text-white hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Area  */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {!hasMessages && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl rounded-tl-sm text-sm text-slate-700 leading-relaxed">
                Hi there! I can help you analyze your business data.
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Suggested Questions</span>
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.label)}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-[#007e3a]/40 hover:bg-[#007e3a]/5 hover:shadow-sm transition-all text-left group"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="text-slate-400 group-hover:text-[#007e3a] transition-colors">
                      <p.icon size={16} />
                    </div>
                    <span className="text-[13px] text-slate-600 font-medium group-hover:text-[#007e3a] transition-colors">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div key={msg.id} className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
                <span className="text-[11px] font-medium text-slate-400 px-1">
                  {isUser ? "You" : "Assistant"} <span className="opacity-60 font-normal">· {formatTime(msg.timestamp)}</span>
                </span>
                <div
                  className={`
                    px-4 py-2.5 text-[14px] leading-relaxed max-w-[85%] break-words shadow-sm
                    ${isUser
                      ? "bg-[#007e3a] text-white rounded-2xl rounded-tr-sm"
                      : "bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm"
                    }
                  `}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-col gap-1.5 items-start">
              <span className="text-[11px] font-medium text-slate-400 px-1">Assistant <span className="opacity-60 font-normal">· typing...</span></span>
              <div className="bg-white border border-slate-100 shadow-sm px-4 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full typing-dot" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full typing-dot" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full typing-dot" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[13px] p-3.5 rounded-xl shadow-sm flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Footer / Input Area - Clean White */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:bg-white transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              rows={1}
              disabled={isLoading}
              className="flex-1 max-h-[120px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-[14px] text-slate-700 py-2 px-3 placeholder:text-slate-400 leading-relaxed scrollbar-thin"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="p-2.5 mb-0.5 mr-0.5 bg-[#007e3a] text-white rounded-lg shadow-sm hover:bg-[#00622d] hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#007e3a] flex-shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} className="ml-0.5" />
              )}
            </button>
          </div>
          <div className="text-[11px] text-slate-400 text-center mt-2.5 font-medium">
            Press <kbd className="font-sans px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500">Enter</kbd> to send
          </div>
        </div>
      </div>
    </>
  );
}

export default DataChatPanel;
