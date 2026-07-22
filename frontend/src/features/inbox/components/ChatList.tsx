import React, { memo, useState, useMemo } from "react";
import { Search, Plus, User2, ListChecks, Check, X, CheckCircle2, Inbox, MessageSquare, Send, Loader2 } from "lucide-react";
import type { Conversation, CustomMessage } from "../../../api/messaging";
import { messagingApi } from "../../../api/messaging";
import { messagingStore } from "../../../store/messagingStore";
import { formatChatListTime } from "../utils";
import { showToast } from "../../../utils/toast";


interface ChatListProps {
  chats: Conversation[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onStartNewChat: () => void;
  isLoading?: boolean;
}




const ContactAvatar = memo(function ContactAvatar({
  name,
  phone,
  profilePicUrl,
  isSaved,
}: {
  name?: string | null;
  phone: string;
  profilePicUrl?: string | null;
  isSaved?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  const hasName = Boolean(name && name.trim() && name.trim() !== phone.trim());
  const displayName = hasName ? name!.trim() : phone;
  const initial = hasName ? displayName.charAt(0).toUpperCase() : "";




  // avatar backgrounds for saved contacts with name
  const getAvatarColor = (str: string) => {
    const colors = [
      "bg-emerald-600 text-white",
      "bg-blue-600 text-white",
      "bg-indigo-600 text-white",
      "bg-purple-600 text-white",
      "bg-teal-600 text-white",
      "bg-cyan-600 text-white",
      "bg-amber-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  //  Has Profile Picture
  if (profilePicUrl && !imgError) {
    return (
      <div className="relative flex-shrink-0">
        <img
          src={profilePicUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
        />
      </div>
    );
  }

  //  Saved Contact with Name -> Show Name Initial in Colorful Circle
  if (hasName && isSaved !== false) {
    const avatarBg = getAvatarColor(displayName);
    return (
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 ${avatarBg} relative`}
      >
        <span>{initial}</span>
      </div>
    );
  }

  //  Unsaved Contact -> Standard Profile User Icon
  return (
    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-300/50 dark:border-slate-600/50">
      <User2 className="h-5 w-5" />
    </div>
  );
});



export const ChatList = memo(function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  onStartNewChat,
  isLoading,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Saved Custom Messages Modal States
  const [showCustomMsgModal, setShowCustomMsgModal] = useState(false);
  const [customMessages, setCustomMessages] = useState<CustomMessage[]>([]);
  const [loadingCustomMessages, setLoadingCustomMessages] = useState(false);
  const [selectedCustomMsg, setSelectedCustomMsg] = useState<CustomMessage | null>(null);
  const [isSendingCustomMsg, setIsSendingCustomMsg] = useState(false);


  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (c.contact?.name || "").toLowerCase();
      const phone = (c.contact?.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [chats, statusFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredChats.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredChats.map((c) => c.id));
    }
  };

  const handleBulkChangeStatus = async (status: 'open' | 'resolved') => {
    if (selectedIds.length === 0 || isBulkUpdating) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          messagingApi.updateConversation(id, { status }).then(() => messagingStore.updateStatus(id, status))
        )
      );
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed bulk status update:", err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const fetchCustomMessages = async () => {
    setLoadingCustomMessages(true);
    try {
      const res = await messagingApi.listCustomMessages();
      setCustomMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load custom messages:", err);
      showToast("Error", "Failed to load saved custom messages.", "error");
    } finally {
      setLoadingCustomMessages(false);
    }
  };

  const handleSendCustomMsgToSelected = async () => {
    if (!selectedCustomMsg || selectedIds.length === 0 || isSendingCustomMsg) return;
    setIsSendingCustomMsg(true);

    try {
      const results = await Promise.allSettled(
        selectedIds.map(async (convId) => {
          const res = await messagingApi.sendMessage(convId, { body: selectedCustomMsg.text });
          messagingStore.pushMessage(convId, res.data);
          messagingStore.updateConversationMeta(convId, {
            last_message: {
              body: res.data.body,
              direction: res.data.direction,
              msg_type: res.data.msg_type,
              media_url: res.data.media_url,
            },
            last_message_at: res.data.timestamp,
          });
          return res.data;
        })
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      showToast("Messages Sent", `Custom message sent to ${successCount} contact(s).`, "success");

      setShowCustomMsgModal(false);
      setSelectedCustomMsg(null);
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      console.error("Failed to send custom messages:", err);
      showToast("Send Failed", "An error occurred while sending custom messages.", "error");
    } finally {
      setIsSendingCustomMsg(false);
    }
  };

  return (
    <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/40 dark:bg-slate-900/50 h-full transition duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
            Conversations
            {filteredChats.length > 0 && (
              <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                {filteredChats.length}
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              title="Toggle Multi-Select Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-bold ${isSelectMode
                ? "bg-[#007e3a] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              {isSelectMode ? <X className="h-3.5 w-3.5" /> : <ListChecks className="h-3.5 w-3.5" />}
              {isSelectMode ? "Cancel" : "Select"}
            </button>
            <button
              onClick={onStartNewChat}
              className="flex items-center gap-1 text-[#007e3a] hover:text-[#00662f] bg-[#007e3a]/10 hover:bg-[#007e3a]/20 px-2.5 py-1 rounded-lg transition-colors text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              New
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-800 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "open", label: "Open" },
            { id: "resolved", label: "Resolved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex-shrink-0 ${statusFilter === tab.id
                ? "bg-[#007e3a] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Select Mode Bar & Bulk Actions */}
        {isSelectMode && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border">
            <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200">
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-2 font-semibold hover:text-[#007e3a] transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filteredChats.length > 0 && selectedIds.length === filteredChats.length
                    ? "bg-[#007e3a] border-[#007e3a] text-white"
                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    }`}
                >
                  {filteredChats.length > 0 && selectedIds.length === filteredChats.length && (
                    <Check className="h-3 w-3 stroke-[3]" />
                  )}
                </div>
                <span>Select All</span>
              </button>
              <span className="font-bold text-[11px] text-[#007e3a]">
                {selectedIds.length} of {filteredChats.length} selected
              </span>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
                <button
                  onClick={() => {
                    setShowCustomMsgModal(true);
                    fetchCustomMessages();
                  }}
                  disabled={isBulkUpdating}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-[10px] font-bold rounded-md shadow-xs transition-colors whitespace-nowrap"
                >
                  <MessageSquare className="h-3 w-3" />
                  Custom Msg
                </button>
                <button
                  onClick={() => handleBulkChangeStatus("resolved")}
                  disabled={isBulkUpdating}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-600 text-[10px] font-bold rounded-md shadow-xs transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Resolve
                </button>
                <button
                  onClick={() => handleBulkChangeStatus("open")}
                  disabled={isBulkUpdating}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-600 text-[10px] font-bold rounded-md shadow-xs transition-colors whitespace-nowrap"
                >
                  <Inbox className="h-3 w-3" />
                  Open
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat / Contact List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading conversations...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {searchQuery || statusFilter !== "all"
              ? "No contacts found matching filter."
              : "No active conversations."}
          </div>
        ) : (
          filteredChats.map((c) => {
            const hasUnread = c.unread_count > 0;
            const timeStr = formatChatListTime(c.last_message_at);
            const isSelected = selectedIds.includes(c.id);

            return (
              <button
                key={c.id}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelect(c.id);
                  } else {
                    onSelectChat(c.id);
                  }
                }}
                className={`w-full text-left p-3 flex items-center space-x-3 transition hover:bg-slate-100/60 dark:hover:bg-slate-800/40 relative ${selectedChatId === c.id && !isSelectMode
                  ? "bg-[#007e3a]/10 dark:bg-[#007e3a]/20 border-l-4 border-[#007e3a]"
                  : isSelected
                    ? "bg-[#007e3a]/5 dark:bg-[#007e3a]/15 border-l-4 border-[#007e3a]"
                    : "border-l-4 border-transparent"
                  }`}
              >
                {/* Select Checkbox (Standard UI) */}
                {isSelectMode && (
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${isSelected
                      ? "bg-[#007e3a] border-[#007e3a] text-white shadow-xs scale-105"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                )}

                {/* Profile Like Icon / Avatar */}
                <ContactAvatar
                  name={c.contact.name}
                  phone={c.contact.phone}
                  profilePicUrl={c.contact.profile_pic_url}
                  isSaved={c.contact.is_saved}
                />

                {/* Contact Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs truncate ${selectedChatId === c.id || hasUnread
                        ? "font-bold text-slate-900 dark:text-slate-100"
                        : "font-semibold text-slate-700 dark:text-slate-300"
                        }`}
                    >
                      {c.contact.name || c.contact.phone}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap ml-2 flex-shrink-0">
                      {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-[11px] truncate ${hasUnread
                        ? "text-slate-800 dark:text-slate-200 font-semibold"
                        : "text-slate-500 dark:text-slate-400"
                        }`}
                    >
                      {c.last_message ? (
                        <span className="flex items-center gap-1.5 truncate">
                          {c.last_message.direction === "outbound" && (
                            <span className="text-slate-400 font-medium">
                              You:{" "}
                            </span>
                          )}
                          {c.last_message.msg_type === "image" &&
                            c.last_message.media_url && (
                              <img
                                src={c.last_message.media_url}
                                alt="preview"
                                className="h-3.5 w-3.5 rounded-sm object-cover flex-shrink-0"
                              />
                            )}
                          {c.last_message.msg_type !== "text" && (
                            <span className="text-[#007e3a] font-medium">
                              [{c.last_message.msg_type}]
                            </span>
                          )}
                          {c.last_message.body && (
                            <span className="truncate">
                              {c.last_message.body}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">
                          No messages yet
                        </span>
                      )}
                    </p>
                    {hasUnread && (
                      <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#007e3a] text-white text-[9px] font-bold ml-1 flex-shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Send Custom Message Modal for Multi-Selected Contacts */}
      {showCustomMsgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#007e3a]" />
                Send Custom Message ({selectedIds.length} Contacts)
              </h4>
              <button
                onClick={() => {
                  setShowCustomMsgModal(false);
                  setSelectedCustomMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingCustomMessages ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" />
                Loading saved custom messages...
              </div>
            ) : customMessages.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-slate-500 font-medium">No saved custom messages found.</p>
                <p className="text-[11px] text-slate-400">
                  Create custom messages under Saved Custom Messages first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-xs text-slate-500 font-medium mb-2">Select a saved custom message to send:</p>
                {customMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedCustomMsg(msg)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCustomMsg?.id === msg.id
                      ? "border-[#007e3a] bg-[#007e3a]/5 dark:bg-[#007e3a]/10 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                  >
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">{msg.title}</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedCustomMsg && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Message Preview:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                  {selectedCustomMsg.text}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowCustomMsgModal(false);
                  setSelectedCustomMsg(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCustomMsgToSelected}
                disabled={!selectedCustomMsg || isSendingCustomMsg}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#007e3a] hover:bg-[#00662f] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isSendingCustomMsg ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send to {selectedIds.length} Contacts
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatList;
