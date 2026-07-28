import React, { useEffect, useState, useMemo } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Search
} from 'lucide-react';
import { ConfirmDialog } from '../../../../components/shared/ConfirmDialog';
import { fetchAiProviders, createAiProvider, updateAiProvider, deleteAiProvider, AiProviderConfig, AiProviderPayload } from '../../../../api/ai';
import toast from 'react-hot-toast';
import { AiProviderModal } from '../modals/AiProviderModal';

export function AiProvidersTab() {
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AiProviderConfig | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await fetchAiProviders();
      setProviders(data);
    } catch {
      toast.error('Failed to load AI providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase();
    return providers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.ai_provider_name.toLowerCase().includes(q)
    );
  }, [providers, searchQuery]);

  const handleSave = async (payload: AiProviderPayload) => {
    try {
      if (editTarget) {
        await updateAiProvider(editTarget.id, payload);
        toast.success('AI Provider updated successfully');
      } else {
        await createAiProvider(payload);
        toast.success('AI Provider created successfully');
      }
      await fetchList();
    } catch (error) {
      toast.error('Failed to save AI Provider');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteAiProvider(deleteTargetId);
      setProviders((prev) => prev.filter((i) => i.id !== deleteTargetId));
      toast.success('AI Provider deleted successfully');
      setDeleteTargetId(null);
    } catch (error) {
      toast.error('Failed to delete AI Provider');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            AI Provider Credentials
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/20">
              {providers.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure LLM engines (OpenAI, Claude, Gemini) powering chatbot nodes.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      </div>

      {providers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI providers by profile or service type..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition"
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#007e3a]" />
          <p className="text-xs text-slate-400">Loading AI provider configs...</p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
            <Bot className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'No matching AI providers found' : 'No AI providers configured'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Add API keys for OpenAI, Anthropic, or Google to activate automated AI response nodes.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add AI Provider
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredProviders.map((p) => (
            <div
              key={p.id}
              className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{p.name}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {p.ai_provider_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    API Key: <span className="text-slate-700 dark:text-slate-300 font-semibold">{p.ai_provider_api_key ? '••••••••••••' : 'Not configured'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => { setEditTarget(p); setModalOpen(true); }}
                  title="Edit Provider Config"
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteTargetId(p.id)}
                  title="Delete Provider Config"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <AiProviderModal initial={editTarget} onClose={() => setModalOpen(false)} onSave={handleSave} />}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete AI Provider"
        description="Are you sure you want to delete this AI Provider configuration?"
        confirmLabel="Delete Provider"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
