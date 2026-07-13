import React, { useEffect, useRef, useState, memo } from "react";
import type { Conversation, Message } from "../../../api/messaging";
import { messagingApi } from "../../../api/messaging";
import { messagingStore } from "../../../store/messagingStore";
import { Check, CheckCheck, Clock, User2, Trash2, ExternalLink, Reply, ChevronDown } from "lucide-react";
import { useRouter } from "../../../router";

import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { MessageBubble } from './chat/MessageBubble';



interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  isLoading?: boolean;
  onReply?: (msg: any) => void;
}

export const ChatWindow = memo(function ChatWindow({ conversation, messages, isLoading, onReply }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { navigate } = useRouter();

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Show button if we are scrolled up by more than 100px from the bottom
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

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

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50/10 dark:bg-slate-900/10 transition duration-200 relative">
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
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2] dark:bg-slate-950/50 relative">
        
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
          messages.map((m) => (
            <MessageBubble 
              key={m.id}
              message={m}
              isOutbound={m.direction === 'outbound'}
              onReply={onReply}
              onDelete={setDeleteId}
            />
          ))
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-20 flex items-center justify-center group"
          title="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4 group-hover:text-[#007e3a] dark:group-hover:text-[#00b359] transition-colors" />
        </button>
      )}

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
});

export default ChatWindow;
