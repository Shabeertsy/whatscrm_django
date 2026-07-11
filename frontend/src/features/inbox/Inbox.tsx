import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatList } from "./components/ChatList";
import { ChatWindow } from "./components/ChatWindow";
import { MessageComposer } from "./components/MessageComposer";
import { useInboxSocket } from "./hooks/useInboxSocket";
import { isWhatsAppWindowOpen } from "./utils";
import { useMessagingStore, messagingStore } from "../../store/messagingStore";
import { messagingApi } from "../../api/messaging";
import { showToast } from "../../utils/toast";



export function Inbox() {
  const [store] = useMessagingStore();
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle prefilled text from URL (e.g. from Hotels "Share to Chat")
  useEffect(() => {
    const text = searchParams.get('text');
    if (text) {
      setNewMessageText(text);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !store.activeConversationId || isSending || !windowOpen) return;

    setIsSending(true);
    const textToSend = newMessageText;
    setNewMessageText("");

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
      setNewMessageText(textToSend);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaSelect = async (file: File) => {
    if (!store.activeConversationId || isSending || !windowOpen) return;
    
    setIsSending(true);
    try {
      //  Upload file to Django backend
      const uploadRes = await messagingApi.uploadMedia(file, store.activeConversationId);
      const mediaUrl = uploadRes.data.url;
      
      //  Determine msg_type
      let msgType = 'document';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';

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

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition duration-200">
      <ChatList
        chats={store.conversations}
        selectedChatId={store.activeConversationId}
        isLoading={store.isLoadingConversations}
        onSelectChat={id => messagingStore.setActiveConversation(id)}
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
              onReply={(msg) => setReplyingTo(msg)}
            />
            <MessageComposer
              value={newMessageText}
              onChange={setNewMessageText}
              onSubmit={handleSendMessage}
              onMediaSelect={handleMediaSelect}
              disabled={!windowOpen}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Inbox;
