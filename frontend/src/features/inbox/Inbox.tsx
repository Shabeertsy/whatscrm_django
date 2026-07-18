import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatList } from "./components/ChatList";
import { ChatWindow } from "./components/ChatWindow";
import { MessageComposer } from "./components/MessageComposer";
import { StartChatModal } from "./components/StartChatModal";
import { useInboxSocket } from "./hooks/useInboxSocket";
import { isWhatsAppWindowOpen } from "./utils";
import { useMessagingStore, messagingStore } from "../../store/messagingStore";
import { messagingApi } from "../../api/messaging";
import { fetchAiAgentConfig } from "../../api/ai";
import { showToast } from "../../utils/toast";
import { useCallback } from "react";



export function Inbox() {
  const [store] = useMessagingStore();
  const [initialComposerText, setInitialComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showStartChat, setShowStartChat] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAiActive, setIsAiActive] = useState(false);

  // Fetch AI agent global status
  useEffect(() => {
    fetchAiAgentConfig().then(config => setIsAiActive(config.is_active)).catch(console.error);
  }, []);

  // Handle prefilled text from URL (e.g. from Hotels "Share to Chat")
  useEffect(() => {
    const text = searchParams.get('text');
    if (text) {
      setInitialComposerText(text);
      // Wait for it to apply then clear it so it doesn't persist
      setTimeout(() => setInitialComposerText(""), 100);
      searchParams.delete('text');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Initialize live WebSocket connection
  useInboxSocket();

  // Load conversations on mount
  useEffect(() => {
    messagingStore.setState({ isLoadingConversations: true });
    messagingApi.listConversations()
      .then(res => {
        messagingStore.setConversations(res.data);
        if (res.data.length > 0 && !store.activeConversationId) {
          messagingStore.setActiveConversation(res.data[0].id);
        }
      })
      .catch(err => {
        console.error("Failed to load conversations:", err);
        messagingStore.setState({ error: "Failed to load conversations", isLoadingConversations: false });
      });
  }, []);

  // When active conversation changes, fetch messages and mark as read
  useEffect(() => {
    if (!store.activeConversationId) return;

    const activeConv = store.conversations.find(c => c.id === store.activeConversationId);
    if (activeConv && activeConv.unread_count > 0) {
      messagingApi.markRead(activeConv.id)
        .then(() => messagingStore.markRead(activeConv.id))
        .catch(console.error);
    }

    if (!store.messagesByConvId[store.activeConversationId]) {
      messagingStore.setState({ isLoadingMessages: true });
      messagingApi.getConversation(store.activeConversationId)
        .then(res => {
          messagingStore.setMessages(store.activeConversationId!, res.data.messages || []);
        })
        .catch(err => {
          console.error("Failed to load messages:", err);
          messagingStore.setState({ isLoadingMessages: false });
        });
    }
    setReplyingTo(null);
  }, [store.activeConversationId]);

  const activeConversation = store.conversations.find(c => c.id === store.activeConversationId);
  const activeMessages = store.activeConversationId
    ? (store.messagesByConvId[store.activeConversationId] || [])
    : [];

  const windowOpen = isWhatsAppWindowOpen(activeConversation, activeMessages, store.isLoadingMessages);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !store.activeConversationId || isSending || !windowOpen) return;

    setIsSending(true);

    try {
      const payload: any = { body: textToSend };
      if (replyingTo) {
        payload.reply_to_message_id = replyingTo.id;
      }
      const res = await messagingApi.sendMessage(store.activeConversationId, payload);
      setReplyingTo(null);
      
      messagingStore.pushMessage(store.activeConversationId, res.data);
      messagingStore.updateConversationMeta(store.activeConversationId, {
        last_message: {
          body: res.data.body,
          direction: res.data.direction,
          msg_type: res.data.msg_type,
          media_url: res.data.media_url,
        },
        last_message_at: res.data.timestamp,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
      throw error; 
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaSelect = async (file: File) => {
    if (!store.activeConversationId || isSending || !windowOpen) return;
    
    // Determine msg_type
    let msgType = 'document';
    if (file.type.startsWith('image/')) msgType = 'image';
    else if (file.type.startsWith('video/')) msgType = 'video';
    else if (file.type.startsWith('audio/')) msgType = 'audio';

    const isCeleryEnabled = import.meta.env.VITE_CELERY_ENABLED === 'true';
    
    let limit = 16 * 1024 * 1024; // 16MB default
    if (msgType === 'document') {
      limit = 100 * 1024 * 1024;
    } else if (msgType === 'video' && isCeleryEnabled) {
      limit = 200 * 1024 * 1024;
    }

    if (file.size > limit) {
      if (msgType === 'video' && !isCeleryEnabled) {
         showToast('Video Too Large', 'File size exceeds the 16MB limit. Enable background processing for larger videos.', 'error');
      } else {
         showToast('File Too Large', `File size exceeds the ${limit / (1024 * 1024)}MB limit for ${msgType}.`, 'error');
      }
      return;
    }

    if (msgType === 'video' && isCeleryEnabled && file.size > 16 * 1024 * 1024) {
      showToast('Video Compression', 'Videos larger than 16MB will be compressed due to Meta API restrictions. This may take a while.', 'info');
    }

    setIsSending(true);
    try {
      //  Upload file to Django backend
      const uploadRes = await messagingApi.uploadMedia(file, store.activeConversationId);
      
      //  Send message with media
      const payload: any = { 
        msg_type: msgType, 
        media_url: uploadRes.data.url,
        storage_path: uploadRes.data.path,
        body: '' 
      };
      if (replyingTo) {
        payload.reply_to_message_id = replyingTo.id;
      }
      
      const res = await messagingApi.sendMessage(store.activeConversationId, payload);
      setReplyingTo(null);

      messagingStore.pushMessage(store.activeConversationId, res.data);
      messagingStore.updateConversationMeta(store.activeConversationId, {
        last_message: {
          body: res.data.body,
          direction: res.data.direction,
          msg_type: res.data.msg_type,
          media_url: res.data.media_url,
        },
        last_message_at: res.data.timestamp,
      });
    } catch (error: any) {
      console.error("Failed to upload/send media:", error);
      const errorDetail = error.response?.data?.detail || "Failed to send media. Please try again.";
      showToast('Upload Failed', errorDetail, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = async (template: any) => {
    if (!store.activeConversationId || isSending) return;
    
    setIsSending(true);
    try {
      const headerText = template.components?.find((c: any) => c.type === 'HEADER')?.text;
      const bodyText = template.components?.find((c: any) => c.type === 'BODY')?.text || '';
      const footerText = template.components?.find((c: any) => c.type === 'FOOTER')?.text;
      
      let previewText = `[Template: ${template.name}]\n`;
      if (headerText) previewText += `*${headerText}*\n\n`;
      previewText += bodyText;
      if (footerText) previewText += `\n\n_${footerText}_`;

      const payload: any = { 
        msg_type: 'template', 
        template_name: template.name,
        template_language: template.language,
        body: previewText 
      };
      
      const res = await messagingApi.sendMessage(store.activeConversationId, payload);
      
      messagingStore.pushMessage(store.activeConversationId, res.data);
      messagingStore.updateConversationMeta(store.activeConversationId, {
        last_message: {
          body: res.data.body,
          direction: res.data.direction,
          msg_type: res.data.msg_type,
          media_url: res.data.media_url,
        },
        last_message_at: res.data.timestamp,
      });
      showToast('Template Sent', `Template ${template.name} sent successfully.`, 'success');
    } catch (error: any) {
      console.error("Failed to send template:", error);
      const errorDetail = error.response?.data?.detail || "Failed to send template. Please try again.";
      showToast('Send Failed', errorDetail, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectChat = useCallback((id: string) => {
    messagingStore.setActiveConversation(id);
  }, []);

  const handleReply = useCallback((msg: any) => {
    setReplyingTo(msg);
  }, []);

  const handleStartNewChat = async (data: { phone: string; instance_id: string; template_name: string; template_language: string; body: string; name?: string; save_contact?: boolean }) => {
    try {
      const res = await messagingApi.startConversation(data);
      // Add conversation to store if not exists
      const exists = store.conversations.find(c => c.id === res.data.conversation.id);
      if (!exists) {
        messagingStore.setConversations([res.data.conversation, ...store.conversations]);
      }
      // Push message
      messagingStore.pushMessage(res.data.conversation.id, res.data.message);
      // Switch to this conversation
      messagingStore.setActiveConversation(res.data.conversation.id);
      showToast('Chat Started', `Template sent to ${data.phone}`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to Start Chat', err.response?.data?.error || err.response?.data?.detail || 'An error occurred', 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition duration-200">
      <ChatList
        chats={store.conversations}
        selectedChatId={store.activeConversationId}
        isLoading={store.isLoadingConversations}
        onSelectChat={handleSelectChat}
        onStartNewChat={() => setShowStartChat(true)}
      />
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-slate-900">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a conversation to start messaging
          </div>
        ) : (
          <>
            <ChatWindow
              conversation={activeConversation}
              messages={activeMessages}
              isLoading={store.isLoadingMessages}
              isAiActive={isAiActive}
              onReply={handleReply}
            />
            <MessageComposer
              initialValue={initialComposerText}
              onClearInitial={() => setInitialComposerText("")}
              onSubmit={handleSendMessage}
              onMediaSelect={handleMediaSelect}
              disabled={!windowOpen}
              isSending={isSending}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onSendTemplate={handleSendTemplate}
            />
          </>
        )}
      </div>

      {showStartChat && (
        <StartChatModal
          onClose={() => setShowStartChat(false)}
          onSubmit={handleStartNewChat}
        />
      )}
    </div>
  );
}

export default Inbox;
