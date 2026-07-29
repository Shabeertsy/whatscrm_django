import React, { useEffect, useState } from "react";
import PageHeader from "../../components/shared/PageHeader";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { messagingApi, CustomMessage } from "../../api/messaging";
import { showToast } from "../../utils/toast";
import { Plus, Edit2, Trash2, MessageSquareText, Copy } from "lucide-react";

export function CustomMessages() {
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<CustomMessage | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({ title: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await messagingApi.listCustomMessages();
      setMessages(res.data || []);
    } catch (e: any) {
      console.error(e);
      showToast("Error", e?.response?.data?.detail || e?.message || "Failed to load custom messages", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied", "Message content copied to clipboard", "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMessage) {
        await messagingApi.updateCustomMessage(editingMessage.id, formData);
        showToast("Success", "Custom message updated successfully", "success");
      } else {
        await messagingApi.createCustomMessage(formData);
        showToast("Success", "Custom message created successfully", "success");
      }
      setIsFormOpen(false);
      setEditingMessage(null);
      setFormData({ title: "", text: "" });
      fetchData();
    } catch (err: any) {
      showToast("Error", err?.response?.data?.detail || err?.message || "Error saving custom message", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteMessageId) return;
    setIsDeleting(true);
    try {
      await messagingApi.deleteCustomMessage(deleteMessageId);
      showToast("Success", "Custom message deleted successfully", "success");
      fetchData();
      setDeleteMessageId(null);
    } catch (err: any) {
      showToast("Error", err?.response?.data?.detail || err?.message || "Failed to delete custom message", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const openForm = (msg?: CustomMessage) => {
    if (msg) {
      setEditingMessage(msg);
      setFormData({ title: msg.title, text: msg.text });
    } else {
      setEditingMessage(null);
      setFormData({ title: "", text: "" });
    }
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <PageHeader
          title="Custom Messages"
          description="Create and manage your quick replies."
        />
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-gradient-to-r from-[#007e3a] to-[#00a84e] hover:from-[#00602d] hover:to-[#008f42] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Create Message
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading custom messages...</div>
      ) : messages.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm transition-all">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center text-[#007e3a] mb-6 shadow-sm border border-green-200 dark:border-green-800/50">
            <MessageSquareText className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">No custom messages yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-center max-w-sm text-base leading-relaxed">
            Create quick replies and canned responses to respond to your customers faster and more efficiently.
          </p>
          <button onClick={() => openForm()} className="flex items-center gap-2 bg-[#007e3a] hover:bg-[#00602d] text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            <Plus className="h-5 w-5" /> Create your first message
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header Info */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <MessageSquareText className="h-4 w-4 text-[#007e3a] shrink-0" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate" title={msg.title}>
                        {msg.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                        Quick Reply
                      </span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble Preview */}
                <div className="bg-[#f0f4f1] dark:bg-slate-800/80 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 my-3 border border-emerald-900/5 dark:border-slate-700/60 shadow-inner relative font-sans">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-normal line-clamp-6">
                    {msg.text}
                  </p>
                </div>
              </div>

              {/* Footer / Actions Bar */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Predefined Message
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyText(msg.text)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                    title="Copy Message Text"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openForm(msg)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                    title="Edit Message"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteMessageId(msg.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs"
                    title="Delete Message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 transform transition-all">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#007e3a]/10 flex items-center justify-center text-[#007e3a]">
                  <MessageSquareText className="w-4 h-4" />
                </div>
                {editingMessage ? "Edit Custom Message" : "Create Custom Message"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Welcome Greeting"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Message Content
                </label>
                <textarea
                  required
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Type your predefined message here..."
                  rows={6}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] resize-none transition-all leading-relaxed"
                />
              </div>

              <div className="pt-6 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#007e3a] to-[#00a84e] hover:from-[#00602d] hover:to-[#008f42] rounded-xl transition-all shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  {editingMessage ? "Save Changes" : "Create Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteMessageId}
        title="Delete Custom Message"
        description="Are you sure you want to delete this custom message? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteMessageId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default CustomMessages;
