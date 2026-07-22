import React, { useEffect, useState } from "react";
import PageHeader from "../../components/shared/PageHeader";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { messagingApi, CustomMessage } from "../../api/messaging";
import { showToast } from "../../utils/toast";
import { Plus, Edit2, Trash2, MessageSquareText } from "lucide-react";

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {messages.map((msg) => (
            <div key={msg.id} className="relative bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl p-6 shadow-sm flex flex-col h-full">
              
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#007e3a]/10 to-[#00a84e]/10 border border-[#007e3a]/20 flex items-center justify-center text-[#007e3a]">
                    <MessageSquareText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate max-w-[180px]">{msg.title}</h3>
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openForm(msg)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all" title="Edit message">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteMessageId(msg.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all" title="Delete message">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50 flex-grow">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-5">
                  {msg.text}
                </p>
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
