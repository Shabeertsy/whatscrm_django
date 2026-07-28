import React, { useEffect, useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Pencil,
  Search
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { whatsappApi } from '../../../api/whatsapp';
import type { WhatsappInstance, WhatsappInstancePayload } from '../../../types/whatsapp';
import toast from 'react-hot-toast';
import { InstanceModal } from './InstanceModal';
import { CopyButton } from './CopyButton';


export function WhatsappInstancesTab() {
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WhatsappInstance | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.listInstances();
      const data = res.data;
      setInstances(Array.isArray(data) ? data : (data as any).results ?? []);
    } catch {
      toast.error('Failed to load WhatsApp instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const filteredInstances = useMemo(() => {
    if (!searchQuery.trim()) return instances;
    const q = searchQuery.toLowerCase();
    return instances.filter(
      (inst) =>
        inst.display_name.toLowerCase().includes(q) ||
        inst.phone_number_id.toLowerCase().includes(q) ||
        inst.whatsapp_business_account_id.toLowerCase().includes(q)
    );
  }, [instances, searchQuery]);

  const handleSave = async (payload: WhatsappInstancePayload) => {
    try {
      if (editTarget) {
        await whatsappApi.updateInstance(editTarget.id, payload);
        toast.success('Instance updated successfully');
      } else {
        await whatsappApi.createInstance(payload);
        toast.success('Instance created successfully');
      }
      await fetchInstances();
    } catch (error) {
      toast.error('Failed to save instance');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await whatsappApi.deleteInstance(deleteTargetId);
      setInstances((prev) => prev.filter((i) => i.id !== deleteTargetId));
      toast.success('Instance deleted successfully');
      setDeleteTargetId(null);
    } catch (error) {
      toast.error('Failed to delete instance');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await whatsappApi.toggleActive(id);
      setInstances((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_active: res.data.is_active } : i))
      );
      toast.success('Instance status updated');
    } catch (error) {
      toast.error('Failed to toggle instance state');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            WhatsApp Business Instances
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#007e3a] dark:text-emerald-400 font-semibold border border-emerald-500/20">
              {instances.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connect Meta Cloud API credentials to dispatch flows and incoming messaging lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow"
          >
            <Plus className="h-4 w-4" />
            Add Instance
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      {instances.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instances by display name or Phone ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition"
          />
        </div>
      )}

      {/* Instance List Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#007e3a]" />
          <p className="text-xs text-slate-400">Loading WhatsApp instances...</p>
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-[#007e3a] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'No matching WhatsApp instances found' : 'No WhatsApp instances connected'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search query to find connected instances.'
              : 'Add your Meta Phone Number ID and Access Token to activate automated flow workflows.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add WhatsApp Instance
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredInstances.map((inst) => (
            <div
              key={inst.id}
              className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${inst.is_active
                    ? 'bg-emerald-500/10 text-[#007e3a] dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}>
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {inst.display_name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${inst.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                      {inst.is_active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {inst.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      Phone ID: <strong className="text-slate-700 dark:text-slate-200">{inst.phone_number_id}</strong>
                      <CopyButton text={inst.phone_number_id} label="Phone Number ID" />
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      WABA: <strong className="text-slate-700 dark:text-slate-200">{inst.whatsapp_business_account_id}</strong>
                      <CopyButton text={inst.whatsapp_business_account_id} label="WABA ID" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 justify-end">
                <button
                  onClick={() => handleToggle(inst.id)}
                  disabled={togglingId === inst.id}
                  title={inst.is_active ? 'Deactivate Instance' : 'Activate Instance'}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#007e3a] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                >
                  {togglingId === inst.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" />
                  ) : inst.is_active ? (
                    <ToggleRight className="h-5 w-5 text-[#007e3a] dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={() => { setEditTarget(inst); setModalOpen(true); }}
                  title="Edit Instance Details"
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteTargetId(inst.id)}
                  title="Delete Instance"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <InstanceModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete WhatsApp Instance"
        description="Are you sure you want to remove this WhatsApp instance? Inbound webhooks for this number will no longer process."
        confirmLabel="Delete Instance"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
