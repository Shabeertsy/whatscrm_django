import React, { useEffect, useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Pencil,
  Search,
  Smartphone,
  Cloud,
  QrCode,
  RefreshCw,
  PowerOff,
} from 'lucide-react';

import { ConfirmDialog } from '../../../../components/shared/ConfirmDialog';
import { whatsappApi } from '../../../../api/whatsapp';
import { evolutionApi } from '../../../../api/evolution';
import type { WhatsappInstance, WhatsappInstancePayload } from '../../../../types/whatsapp';
import toast from 'react-hot-toast';
import { InstanceModal } from '../modals/InstanceModal';
import { ScannedDeviceModal } from '../modals/ScannedDeviceModal';
import { CopyButton } from '../ui/CopyButton';



function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WhatsappInstancesTab() {
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Meta Cloud Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WhatsappInstance | null>(null);

  // Scanned Device Modal
  const [scannedModalOpen, setScannedModalOpen] = useState(false);
  const [scannedTarget, setScannedTarget] = useState<WhatsappInstance | null>(null);

  // Actions
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [rescanningId, setRescanningId] = useState<string | null>(null);

  const handleRescan = async (inst: WhatsappInstance) => {
    setRescanningId(inst.id);
    try {
      const res = await evolutionApi.rescanInstance(inst.id);
      setScannedTarget({
        ...inst,
        evolution_qr_code: res.data.qr_code,
        evolution_status: 'connecting',
      });
      setScannedModalOpen(true);
    } catch {
      toast.error('Failed to generate rescan QR code');
    } finally {
      setRescanningId(null);
    }
  };

  const handleSyncChats = async (inst: WhatsappInstance) => {
    setSyncingId(inst.id);
    try {
      const res = await evolutionApi.syncInstanceChats(inst.id);
      toast.success(`Synced ${res.data.imported_messages} messages from phone!`);
    } catch (err) {
      toast.error('Failed to sync chats from device');
    } finally {
      setSyncingId(null);
    }
  };

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
        (inst.phone_number_id && inst.phone_number_id.toLowerCase().includes(q)) ||
        (inst.whatsapp_business_account_id && inst.whatsapp_business_account_id.toLowerCase().includes(q)) ||
        (inst.evolution_instance_name && inst.evolution_instance_name.toLowerCase().includes(q)) ||
        (inst.evolution_phone && inst.evolution_phone.toLowerCase().includes(q))
    );
  }, [instances, searchQuery]);

  const handleSaveMetaInstance = async (payload: WhatsappInstancePayload) => {
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

  const handleDisconnect = async (inst: WhatsappInstance) => {
    setDisconnectingId(inst.id);
    try {
      await evolutionApi.disconnectInstance(inst.id);
      toast.success('Physical phone session disconnected');
      await fetchInstances();
    } catch (err) {
      toast.error('Failed to disconnect device session');
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
            WhatsApp Connections
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {instances.length} {instances.length === 1 ? 'line' : 'lines'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your official Meta Cloud API lines and physical WhatsApp devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setScannedTarget(null); setScannedModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#006830] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            <span>Pair Phone (QR)</span>
          </button>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Meta Cloud API</span>
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
            placeholder="Search connections by name, phone, or ID..."
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
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'No matching WhatsApp connections found' : 'No WhatsApp numbers connected'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Add an official Meta Cloud API credential or scan a physical phone QR code to get started.'}
          </p>
          {!searchQuery && (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => { setScannedTarget(null); setScannedModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#006830] text-white text-xs font-medium rounded-lg transition shadow-sm"
              >
                <QrCode className="h-3.5 w-3.5" />
                Pair Phone (QR)
              </button>
              <button
                onClick={() => { setEditTarget(null); setModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Meta Cloud API
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredInstances.map((inst) => {
            const isScanned = inst.instance_type === 'scanned_device';
            const isScannedConnected = isScanned && inst.evolution_status === 'open';
            const isScannedConnecting = isScanned && inst.evolution_status === 'connecting';
            const isHealthy = isScanned ? isScannedConnected : inst.is_active;

            return (
              <div
                key={inst.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Brand Channel Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isHealthy
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60'
                      }`}>
                      <WhatsAppIcon className="h-5 w-5" />
                    </div>
                    {/* Channel Type Indicator Badge */}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-xs">
                      {isScanned ? <Smartphone className="h-2.5 w-2.5" /> : <Cloud className="h-2.5 w-2.5" />}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1">
                    {/* Primary Row: Title, Type Badge, and Status Indicator */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                        {inst.display_name}
                      </h3>

                      {/* Clean Channel Type Pill */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60">
                        {isScanned ? 'WhatsApp Web' : 'Cloud API'}
                      </span>

                      {/* Clean Status Indicator */}
                      {isScanned ? (
                        isScannedConnected ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-0.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            Connected
                          </span>
                        ) : isScannedConnecting ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium ml-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting QR scan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            Disconnected
                          </span>
                        )
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ml-0.5 ${inst.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${inst.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          {inst.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    {/* Secondary Row: Clean Metadata */}
                    {isScanned ? (
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {inst.evolution_phone ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {inst.evolution_phone}
                          </span>
                        ) : isScannedConnected ? (
                          <span className="text-slate-600 dark:text-slate-300">
                            Connected
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Scan QR code to connect phone
                          </span>
                        )}
                        {!isScannedConnected && (
                          <button
                            onClick={() => { setScannedTarget(inst); setScannedModalOpen(true); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                          >
                            <QrCode className="h-3 w-3" />
                            Scan QR
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-slate-400">Phone ID:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{inst.phone_number_id}</span>
                          <CopyButton text={inst.phone_number_id} label="Phone Number ID" />
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-slate-400">WABA:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{inst.whatsapp_business_account_id}</span>
                          <CopyButton text={inst.whatsapp_business_account_id} label="WABA ID" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 justify-end">
                  {isScanned ? (
                    <>
                      {isScannedConnected ? (
                        <>
                          <button
                            onClick={() => handleSyncChats(inst)}
                            disabled={syncingId === inst.id}
                            title="Sync Chats & Messages from Device"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingId === inst.id ? 'animate-spin text-emerald-600' : ''}`} />
                            <span className="hidden md:inline">Sync</span>
                          </button>
                          <button
                            onClick={() => handleRescan(inst)}
                            disabled={rescanningId === inst.id}
                            title="Rescan QR Code to re-link or switch phone"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            {rescanningId === inst.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <QrCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                            <span className="hidden md:inline">Rescan</span>
                          </button>
                          <button
                            onClick={() => handleDisconnect(inst)}
                            disabled={disconnectingId === inst.id}
                            title="Disconnect physical session"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                          >
                            {disconnectingId === inst.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setScannedTarget(inst); setScannedModalOpen(true); }}
                          title="Scan QR Code"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Scan QR</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggle(inst.id)}
                        disabled={togglingId === inst.id}
                        title={inst.is_active ? 'Deactivate Instance' : 'Activate Instance'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
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
                        title="Edit Meta Credentials"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setDeleteTargetId(inst.id)}
                    title="Delete connection"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meta Modal */}
      {modalOpen && (
        <InstanceModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveMetaInstance}
        />
      )}

      {/* Scanned Device Modal */}
      {scannedModalOpen && (
        <ScannedDeviceModal
          initialInstance={scannedTarget}
          onClose={() => { setScannedModalOpen(false); setScannedTarget(null); }}
          onSuccess={fetchInstances}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete WhatsApp Connection"
        description="Are you sure you want to remove this connection? Inbound webhooks for this number will no longer be processed."
        confirmLabel="Delete Connection"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
