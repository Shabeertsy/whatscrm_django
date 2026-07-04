import React from "react";
import { Search } from "lucide-react";
import { Chat } from "./api";

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string;
  onSelectChat: (id: string) => void;
}

export function ChatList({ chats, selectedChatId, onSelectChat }: ChatListProps) {
  return (
    <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-55 bg-slate-50/40 dark:bg-slate-900/50 h-full transition duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Conversations</h3>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a]/40"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectChat(c.id)}
            className={`w-full text-left p-4 flex justify-between items-start transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
              selectedChatId === c.id ? "bg-[#007e3a]/5 dark:bg-[#007e3a]/10 border-l-4 border-[#007e3a]" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h4 className={`text-xs truncate ${selectedChatId === c.id || c.unread ? "font-bold text-slate-900 dark:text-slate-100" : "font-semibold text-slate-755 text-slate-400"}`}>
                  {c.name}
                </h4>
                {c.unread && <span className="h-2 w-2 rounded-full bg-rose-500"></span>}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">{c.lastMessage}</p>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-550 font-bold whitespace-nowrap">{c.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChatList;
