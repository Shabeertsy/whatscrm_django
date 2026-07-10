import React, { useEffect, useRef, useState } from "react";
import type { Conversation, Message } from "../../../api/messaging";
import { messagingApi } from "../../../api/messaging";
import { messagingStore } from "../../../store/messagingStore";
import { Check, CheckCheck, Clock, User2, Trash2, ExternalLink, Reply } from "lucide-react";
import { useRouter } from "../../../router";
import { formatMessageTime } from "../utils";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";



interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  isLoading?: boolean;
  onReply?: (msg: any) => void;
}

export function ChatWindow({ conversation, messages, isLoading, onReply }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { navigate } = useRouter();

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await messagingApi.deleteMessage(deleteId);
      messagingStore.removeMessage(conversation.id, deleteId);
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete message. It may have already been deleted.');
    } finally {
      setIsDeleting(false);
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
              {conversation.contact.name ? conversation.contact.is_saved : 'Unsaved Contact'}
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
                {/* Actions (Visible on Hover) */}
                <div className={`hidden group-hover:flex items-center mx-2 space-x-1 ${isOutbound ? "order-first" : "order-last"}`}>
                   {onReply && (
                     <button 
                       onClick={() => onReply(m)}
                       className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                       title="Reply"
                     >
                       <Reply className="h-3.5 w-3.5" />
                     </button>
                   )}
                   <button 
                     onClick={() => setDeleteId(m.id)}
                     className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                     title="Delete message"
                   >
                     <Trash2 className="h-3.5 w-3.5" />
                   </button>
                </div>

                <div
                  id={`message-${m.id}`}
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] shadow-sm relative transition-all duration-500 ${
                    isOutbound
                      ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-transparent"
                  }`}
                >
                  {(m as any).replied_to_message && (
                    <div 
                      onClick={() => {
                         const el = document.getElementById(`message-${(m as any).replied_to_message.id}`);
                         if (el) {
                           el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                           el.classList.add('ring-2', 'ring-[#007e3a]', 'ring-offset-2', 'dark:ring-offset-slate-900');
                           setTimeout(() => {
                             el.classList.remove('ring-2', 'ring-[#007e3a]', 'ring-offset-2', 'dark:ring-offset-slate-900');
                           }, 2000);
                         }
                      }}
                      className="mb-2 p-2 rounded bg-black/5 hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/30 cursor-pointer border-l-2 border-[#007e3a] dark:border-[#00b359] text-xs opacity-90 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[10px] text-[#007e3a] dark:text-[#00b359] mb-0.5">
                          {(m as any).replied_to_message.sent_by_name || "Customer"}
                        </div>
                        <div className="line-clamp-1 opacity-80">
                          {(m as any).replied_to_message.msg_type === 'text' 
                            ? (m as any).replied_to_message.body 
                            : `[${(m as any).replied_to_message.msg_type}] ${(m as any).replied_to_message.body || ''}`}
                        </div>
                      </div>
                      {(m as any).replied_to_message.media_url && (
                        <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-black/10">
                          {(m as any).replied_to_message.msg_type === 'image' ? (
                            <img src={(m as any).replied_to_message.media_url} alt="" className="w-full h-full object-cover" />
                          ) : (m as any).replied_to_message.msg_type === 'video' ? (
                            <video src={(m as any).replied_to_message.media_url} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}

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
                  
                  <div className={`flex items-center justify-end space-x-2 mt-1 text-[9px] ${isOutbound ? "text-[#537e42] dark:text-[#84a98c]" : "text-slate-400"}`}>
                    {/* {(m as any).related_room_uuid && (
                      <button 
                        onClick={() => navigate(`/hotels/${(m as any).related_room_uuid}`)}
                        className={`flex items-center gap-1 font-medium hover:underline ${isOutbound ? "text-[#005c4b] dark:text-[#dcf8c6]" : "text-[#007e3a] dark:text-[#00b359]"}`}
                        title="View Room Details"
                      >
                        <ExternalLink className="h-3 w-3" /> View Room
                      </button>
                    )} */}
                    <div className="flex items-center space-x-1">
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
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Message?"
        description="Are you sure you want to delete this message? This action will permanently remove it from the CRM and cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default ChatWindow;
