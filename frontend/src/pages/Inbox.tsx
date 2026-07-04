import React, { useState } from "react";
import ChatList from "../features/inbox/ChatList";
import ChatWindow from "../features/inbox/ChatWindow";
import MessageComposer from "../features/inbox/MessageComposer";
import { initialChats, Chat, Message } from "../features/inbox/api";
import { useInboxSocket } from "../features/inbox/useInboxSocket";

export function Inbox() {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedChatId, setSelectedChatId] = useState<string>("1");
  const [newMessageText, setNewMessageText] = useState<string>("");

  useInboxSocket();

  const activeChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const updatedChats = chats.map((c) => {
      if (c.id === selectedChatId) {
        const newMsg: Message = {
          id: `m_${Date.now()}`,
          sender: "bot",
          text: newMessageText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        return {
          ...c,
          lastMessage: newMessageText,
          time: newMsg.timestamp,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    });

    setChats(updatedChats);
    setNewMessageText("");

    // Simulate Quick Customer Reply
    setTimeout(() => {
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === selectedChatId) {
            const replyMsg: Message = {
              id: `m_reply_${Date.now()}`,
              sender: "customer",
              text: `Got your message: "${newMessageText}". Thanks!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            return {
              ...c,
              lastMessage: replyMsg.text,
              time: replyMsg.timestamp,
              messages: [...c.messages, replyMsg]
            };
          }
          return c;
        })
      );
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition duration-200">
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={(id) => {
          setSelectedChatId(id);
          // Mark as read
          setChats(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
        }}
      />
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatWindow chat={activeChat} />
        <MessageComposer
          value={newMessageText}
          onChange={setNewMessageText}
          onSubmit={handleSendMessage}
        />
      </div>
    </div>
  );
}

export default Inbox;
