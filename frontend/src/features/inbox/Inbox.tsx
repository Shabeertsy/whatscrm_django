import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatList } from "./components/ChatList";
import { ChatWindow } from "./components/ChatWindow";
import { MessageComposer } from "./components/MessageComposer";
import { useInboxSocket } from "./hooks/useInboxSocket";
import { isWhatsAppWindowOpen } from "./utils";
import { useMessagingStore, messagingStore } from "../../store/messagingStore";
import { messagingApi } from "../../api/messaging";



export function Inbox() {
  const [store] = useMessagingStore();
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
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
      const res = await messagingApi.sendMessage(store.activeConversationId, { body: textToSend });
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
            />
            <MessageComposer
              value={newMessageText}
              onChange={setNewMessageText}
              onSubmit={handleSendMessage}
              disabled={!windowOpen}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Inbox;
