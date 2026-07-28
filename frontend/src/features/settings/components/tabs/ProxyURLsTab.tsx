import React, { useEffect, useState, useMemo } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Pencil,
  Search
} from 'lucide-react';
import { ConfirmDialog } from '../../../../components/shared/ConfirmDialog';
import { coreApi, ProxyURL, ProxyURLPayload } from '../../../../api/core';
import toast from 'react-hot-toast';
import { ProxyURLModal } from '../modals/ProxyURLModal';
import { CopyButton } from '../ui/CopyButton';

export function ProxyURLsTab() {
  const [proxies, setProxies] = useState<ProxyURL[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProxyURL | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchProxies = async () => {
    setLoading(true);
    try {
      const res = await coreApi.listProxyURLs();
      const data = res.data;
      setProxies(Array.isArray(data) ? data : (data as any).results ?? []);
    } catch {
      toast.error('Failed to load proxy URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProxies();
  }, []);

  const filteredProxies = useMemo(() => {
    if (!searchQuery.trim()) return proxies;
    const q = searchQuery.toLowerCase();
    return proxies.filter(
      (p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)
    );
  }, [proxies, searchQuery]);

  const handleSave = async (payload: ProxyURLPayload) => {
    try {
      if (editTarget) {
        await coreApi.updateProxyURL(editTarget.id, payload);
        toast.success('Proxy URL updated successfully');
      } else {
        await coreApi.createProxyURL(payload);
        toast.success('Proxy URL created successfully');
      }
      await fetchProxies();
    } catch (error) {
      toast.error('Failed to save proxy URL');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await coreApi.deleteProxyURL(deleteTargetId);
      setProxies((prev) => prev.filter((i) => i.id !== deleteTargetId));
      toast.success('Proxy URL deleted successfully');
      setDeleteTargetId(null);
    } catch (error) {
      toast.error('Failed to delete proxy URL');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await coreApi.toggleProxyURLActive(id);
      await fetchProxies();
      toast.success('Proxy URL status updated');
    } catch (error) {
      toast.error('Failed to toggle proxy URL status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Proxy Gateways
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
              {proxies.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage custom network proxies and fallback URL endpoints.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow"
        >
          <Plus className="h-4 w-4" />
          Add Proxy
        </button>
      </div>

      {proxies.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proxies by name or target URL..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition"
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#007e3a]" />
          <p className="text-xs text-slate-400">Loading proxy gateways...</p>
        </div>
      ) : filteredProxies.length === 0 ? (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Globe className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'No matching proxy URLs found' : 'No proxy URLs configured'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Try modifying your search filter.'
              : 'Add proxy gateway routes to enable custom domain forwarding.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Proxy URL
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredProxies.map((proxy) => (
            <div
              key={proxy.id}
              className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  proxy.is_active
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}>
                  <Globe className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{proxy.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      proxy.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {proxy.is_active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {proxy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                    <span className="truncate">{proxy.url}</span>
                    <CopyButton text={proxy.url} label="URL" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggle(proxy.id)}
                  disabled={togglingId === proxy.id}
                  title={proxy.is_active ? 'Deactivate Proxy' : 'Activate Proxy'}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#007e3a] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                >
                  {togglingId === proxy.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" />
                  ) : proxy.is_active ? (
                    <ToggleRight className="h-5 w-5 text-[#007e3a] dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={() => { setEditTarget(proxy); setModalOpen(true); }}
                  title="Edit Proxy"
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteTargetId(proxy.id)}
                  title="Delete Proxy"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <ProxyURLModal initial={editTarget} onClose={() => setModalOpen(false)} onSave={handleSave} />}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Proxy URL"
        description="Are you sure you want to remove this Proxy URL route?"
        confirmLabel="Delete Proxy"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
