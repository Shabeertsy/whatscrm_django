import React, { useEffect, useRef } from "react";
import type { Conversation, Message } from "../../../api/messaging";
import { messagingApi } from "../../../api/messaging";
import { messagingStore } from "../../../store/messagingStore";
import { Check, CheckCheck, Clock, User2, Trash2 } from "lucide-react";
import { formatMessageTime } from "../utils";



interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  isLoading?: boolean;
}

export function ChatWindow({ conversation, messages, isLoading }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await messagingApi.deleteMessage(messageId);
      messagingStore.removeMessage(conversation.id, messageId);
    } catch (err) {
      console.error(err);
      alert('Failed to delete message. It may have already been deleted.');
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="h-2.5 w-2.5 inline" />;
      case 'delivered': return <CheckCheck className="h-2.5 w-2.5 inline" />;
      case 'read': return <CheckCheck className="h-2.5 w-2.5 inline text-blue-400" />;
      case 'failed': return <span className="text-rose-500">Failed</span>;
      default: return <Clock className="h-2.5 w-2.5 inline" />;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50/10 dark:bg-slate-900/10 transition duration-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
            {conversation.contact.profile_pic_url ? (
              <img src={conversation.contact.profile_pic_url} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <User2 className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {conversation.contact.name || conversation.contact.phone}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {conversation.contact.name ? conversation.contact.phone : 'Unsaved Contact'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {conversation.status === 'open' && (
             <span className="px-2.5 py-1 text-[9px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-bold uppercase tracking-wider">
               Open
             </span>
          )}
          {conversation.status === 'resolved' && (
             <span className="px-2.5 py-1 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-bold uppercase tracking-wider">
               Resolved
             </span>
          )}
          {conversation.agent_name && (
             <span className="px-2.5 py-1 text-[9px] bg-[#007e3a]/10 dark:bg-[#007e3a]/20 text-[#007e3a] dark:text-[#007e3a] border border-[#007e3a]/20 rounded-full font-bold">
               Agent: {conversation.agent_name}
             </span>
          )}
        </div>
      </div>

      {/* Messages Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2] dark:bg-slate-950/50 relative">
        
        {/* Simple pattern overlay for WhatsApp feel */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QPEkMbpXb.png")' }}></div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[10px] text-slate-500 shadow-sm">
              Loading messages...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center p-4">
            <span className="px-3 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full text-[10px] text-slate-500 shadow-sm">
              No messages in this conversation yet. Send one below to start.
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const isOutbound = m.direction === 'outbound';
            const time = formatMessageTime(m.timestamp);
            
            return (
              <div
                key={m.id}
                className={`flex relative z-10 group items-center ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                {/* Delete Button (Visible on Hover) */}
                <div className={`hidden group-hover:flex items-center mx-2 ${isOutbound ? "order-first" : "order-last"}`}>
                   <button 
                     onClick={() => handleDelete(m.id)}
                     className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                     title="Delete message"
                   >
                     <Trash2 className="h-3.5 w-3.5" />
                   </button>
                </div>

                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] shadow-sm relative ${
                    isOutbound
                      ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-transparent"
                  }`}
                >
                  {m.msg_type === 'image' && m.media_url ? (
                    <div className="mb-2 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={m.media_url} alt="Attached image" className="max-w-full h-auto object-cover max-h-64" />
                    </div>
                  ) : m.msg_type !== 'text' ? (
                    <div className="italic text-slate-500 text-[10px] mb-1">[{m.msg_type}] attached</div>
                  ) : null}
                  
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {m.body.split(/(\*[^*]+\*|_[^_]+_)/g).map((part, i) => {
                      if (part.startsWith('*') && part.endsWith('*')) {
                        return <strong key={i}>{part.slice(1, -1)}</strong>;
                      }
                      if (part.startsWith('_') && part.endsWith('_')) {
                        return <em key={i}>{part.slice(1, -1)}</em>;
                      }
                      return part;
                    })}
                  </p>
                  
                  <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${isOutbound ? "text-[#537e42] dark:text-[#84a98c]" : "text-slate-400"}`}>
                    {!isOutbound && m.sent_by_name && (
                       <span>{m.sent_by_name} • </span>
                    )}
                    <span>{time}</span>
                    {isOutbound && (
                      <span className="ml-1 opacity-80">{renderStatusIcon(m.status)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChatWindow;
