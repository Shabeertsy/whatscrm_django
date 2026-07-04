import React from "react";
import { Chat } from "./api";

interface ChatWindowProps {
  chat: Chat;
}

export function ChatWindow({ chat }: ChatWindowProps) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50/10 dark:bg-slate-900/10 h-full transition duration-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{chat.name}</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{chat.phone}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-[9px] bg-[#007e3a]/10 dark:bg-[#007e3a]/20 text-[#007e3a] dark:text-emerald-400 rounded-full border border-[#007e3a]/20 dark:border-[#007e3a]/30 font-bold">
            Auto-Responding Active
          </span>
        </div>
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages.map((m) => {
          const isBot = m.sender === "bot";
          const isCustomer = m.sender === "customer";
          return (
            <div
              key={m.id}
              className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-sm rounded-xl px-4 py-2.5 text-xs shadow-sm ${
                  isCustomer
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                    : "bg-[#007e3a] text-white rounded-br-none"
                }`}
              >
                <p className="font-medium">{m.text}</p>
                <span className={`text-[9px] block text-right mt-1 opacity-70 ${isCustomer ? "text-slate-500 dark:text-slate-400" : "text-white"}`}>
                  {m.timestamp} {isBot && "• CRM Automated"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChatWindow;
