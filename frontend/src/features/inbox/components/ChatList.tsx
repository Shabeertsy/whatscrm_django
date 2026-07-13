import React, { memo } from "react";
import { Search } from "lucide-react";
import type { Conversation } from "../../../api/messaging";
import { formatChatListTime } from "../utils";



interface ChatListProps {
  chats: Conversation[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  isLoading?: boolean;
}


export const ChatList = memo(function ChatList({ chats, selectedChatId, onSelectChat, isLoading }: ChatListProps) {
  return (
    <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/40 dark:bg-slate-900/50 h-full transition duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Conversations</h3>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a]/40"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading conversations...</div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No active conversations.</div>
        ) : (
          chats.map((c) => {
            const hasUnread = c.unread_count > 0;
            const timeStr = formatChatListTime(c.last_message_at);

            return (
              <button
                key={c.id}
                onClick={() => onSelectChat(c.id)}
                className={`w-full text-left p-4 flex justify-between items-start transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                  selectedChatId === c.id ? "bg-[#007e3a]/5 dark:bg-[#007e3a]/10 border-l-4 border-[#007e3a]" : "border-l-4 border-transparent"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <h4 className={`text-xs truncate ${selectedChatId === c.id || hasUnread ? "font-bold text-slate-900 dark:text-slate-100" : "font-semibold text-slate-500 dark:text-slate-400"}`}>
                      {c.contact.name || c.contact.phone}
                    </h4>
                    {hasUnread && (
                      <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#007e3a] text-white text-[9px] font-bold">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] truncate mt-1 ${hasUnread ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                    {c.last_message ? (
                       <span className="flex items-center gap-1.5 truncate">
                         {c.last_message.direction === 'outbound' && <span>You: </span>}
                         {c.last_message.msg_type === 'image' && c.last_message.media_url && (
                           <img src={c.last_message.media_url} alt="preview" className="h-4 w-4 rounded-sm object-cover flex-shrink-0" />
                         )}
                         {c.last_message.msg_type !== 'text' && <span>[{c.last_message.msg_type}]</span>}
                         {c.last_message.body && <span className="truncate">{c.last_message.body}</span>}
                       </span>
                    ) : (
                       <span className="italic">No messages yet</span>
                    )}
                  </p>
                </div>
                <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap pt-0.5">
                  {timeStr}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export default ChatList;
