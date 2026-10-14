import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import type { Conversation, Message } from "../../../api/messaging";
import { messagingApi } from "../../../api/messaging";
import { useMessagingStore, messagingStore } from "../../../store/messagingStore";
import { User2, ChevronDown, Bot, Loader2, Zap } from "lucide-react";
import { useRouter } from "../../../router";

import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { MessageBubble } from './chat/MessageBubble';
import { StagePopup } from './stage-popup/StagePopup';



interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  isLoading?: boolean;
  isAiActive?: boolean;
  onReply?: (msg: any) => void;
}

export const ChatWindow = memo(function ChatWindow({ conversation, messages, isLoading, isAiActive, onReply }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { navigate } = useRouter();

  const [store] = useMessagingStore();
  const { hasMoreMessages, messageOffsets, isLoadingMoreMessages } = store;
  const hasMore = hasMoreMessages[conversation.id];
  const offset = messageOffsets[conversation.id] || 0;

  const isInitialLoadRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const isLoadingOlderRef = useRef(false);
  const activeConvIdRef = useRef(conversation.id);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
      isAtBottomRef.current = true;
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 150;

    isAtBottomRef.current = isNearBottom;
    // Show button if we are scrolled up by more than 100px from the bottom
    setShowScrollButton(distanceFromBottom > 100);

    if (
      !isInitialLoadRef.current &&
      !isLoadingOlderRef.current &&
      !isLoadingMoreMessages &&
      hasMore &&
      scrollHeight > clientHeight + 50 &&
      scrollTop < 50
    ) {
      handleLoadMore();
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMoreMessages || isLoadingOlderRef.current) return;
    messagingStore.setState({ isLoadingMoreMessages: true });
    isLoadingOlderRef.current = true;

    try {
      const oldScrollHeight = scrollRef.current?.scrollHeight || 0;
      const limit = 50;

      const res = await messagingApi.getConversationMessages(conversation.id, limit, offset);
      const newMessages = [...res.data.results].reverse();
      const nextHasMore = !!res.data.next;
      const nextOffset = offset + limit;

      messagingStore.prependMessages(conversation.id, newMessages, nextHasMore, nextOffset);

      // Restore scroll position after DOM updates
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const newScrollHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
        setTimeout(() => {
          isLoadingOlderRef.current = false;
        }, 150);
      });
    } catch (err) {
      console.error('Failed to load older messages', err);
      messagingStore.setState({ isLoadingMoreMessages: false });
      isLoadingOlderRef.current = false;
    }
  };

  // Reset to initial load whenever active conversation ID changes
  useEffect(() => {
    if (activeConvIdRef.current !== conversation.id) {
      activeConvIdRef.current = conversation.id;
      isInitialLoadRef.current = true;
      isAtBottomRef.current = true;
    }
  }, [conversation.id]);

  // Handle messages change and auto-scroll
  useEffect(() => {
    if (isLoadingOlderRef.current) return;

    if (isInitialLoadRef.current || isAtBottomRef.current) {
      scrollToBottom('auto');
    }

    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 600);

    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // ResizeObserver to keep pinned to bottom as media/images/interactive cards expand
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isLoadingOlderRef.current) return;

      if (isInitialLoadRef.current || isAtBottomRef.current) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    });

    resizeObserver.observe(contentEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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

  const handleToggleStatus = async () => {
    const nextStatus: 'open' | 'resolved' = conversation.status === 'resolved' ? 'open' : 'resolved';

    // Optimistic UI update in store
    messagingStore.updateStatus(conversation.id, nextStatus);

    try {
      await messagingApi.updateConversation(conversation.id, { status: nextStatus });
    } catch (err) {
      // Revert if failed
      messagingStore.updateStatus(conversation.id, conversation.status);
      console.error('Failed to toggle status:', err);
    }
  };

  const handleToggleAi = async () => {
    const newStatus = !conversation.ai_active;

    // Optimistic UI update
    messagingStore.updateConversationMeta(conversation.id, { ai_active: newStatus });

    try {
      await messagingApi.updateConversation(conversation.id, { ai_active: newStatus });
    } catch (err) {
      // Revert if failed
      messagingStore.updateConversationMeta(conversation.id, { ai_active: !newStatus });
      console.error(err);
      alert('Failed to update AI status for this conversation.');
    }
  };

  const handleToggleInteractive = async () => {
    const currentVal = conversation.interactive_active !== false;
    const newStatus = !currentVal;
    messagingStore.updateConversationMeta(conversation.id, { interactive_active: newStatus });
    try {
      await messagingApi.updateConversation(conversation.id, { interactive_active: newStatus });
    } catch (err) {
      // Revert if failed
      messagingStore.updateConversationMeta(conversation.id, { interactive_active: currentVal });
      console.error(err);
      alert('Failed to update interactive status for this conversation.');
    }
  };

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
              {conversation.contact.name ? conversation.contact.phone : 'Unsaved Contact'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleStatus}
            title={conversation.status === 'resolved' ? 'Click to mark as Open' : 'Click to mark as Resolved'}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] rounded-full font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${conversation.status === 'resolved'
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300/50 dark:border-emerald-500/30'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${conversation.status === 'resolved' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></span>
            {conversation.status === 'resolved' ? 'Resolved' : 'Open'}
          </button>
          {conversation.agent_name && (
            <span className="px-2.5 py-1 text-[9px] bg-[#007e3a]/10 dark:bg-[#007e3a]/20 text-[#007e3a] dark:text-[#007e3a] border border-[#007e3a]/20 rounded-full font-bold">
              Agent: {conversation.agent_name}
            </span>
          )}
          {isAiActive && (
            <button
              onClick={handleToggleAi}
              title={conversation.ai_active ? "Click to disable AI for this contact" : "Click to enable AI for this contact"}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-full transition-colors cursor-pointer ${conversation.ai_active
                ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold">
                {conversation.ai_active ? "AI Active" : "AI Disabled"}
              </span>
            </button>
          )}

          {/* Interactive Button Response Toggle for Leads */}
          <button
            onClick={handleToggleInteractive}
            title={conversation.interactive_active !== false ? "Interactive replies active. Click to pause/stop interactive buttons for this contact (useful for junk leads)" : "Interactive replies paused. Click to enable interactive buttons"}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${conversation.interactive_active !== false
              ? "bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-500/30"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 opacity-80"
              }`}
          >
            <Zap className={`h-3.5 w-3.5 ${conversation.interactive_active !== false ? "fill-amber-500 text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
            <span>
              {conversation.interactive_active !== false ? "Interactive Active" : "Interactive Paused"}
            </span>
          </button>

          <StagePopup conversation={conversation} />
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-[#efeae2] dark:bg-slate-950/50 relative"
      >
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
          style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QPEkMbpXb.png")' }}
        />

        <div ref={contentRef} className="space-y-4 relative z-0">
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
            <>
              {isLoadingMoreMessages && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isOutbound={m.direction === 'outbound'}
                  onReply={onReply}
                  onDelete={setDeleteId}
                />
              ))}
              <div ref={bottomRef} className="h-px w-full pointer-events-none" />
            </>
          )}
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
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
