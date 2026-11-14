import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { evolutionApi } from '../../../../api/evolution';
import type { WhatsappInstance } from '../../../../types/whatsapp';
import toast from 'react-hot-toast';

export function ScannedDeviceModal({
  initialInstance,
  onClose,
  onSuccess,
  onInstanceCreated,
}: {
  initialInstance?: WhatsappInstance | null;
  onClose: () => void;
  onSuccess: () => void;
  onInstanceCreated?: (instance: WhatsappInstance) => void;
}) {
  const [displayName, setDisplayName] = useState(initialInstance?.display_name || '');
  const [activeInstance, setActiveInstance] = useState<WhatsappInstance | null>(initialInstance || null);
  const [qrCode, setQrCode] = useState<string>(initialInstance?.evolution_qr_code || '');
  const [status, setStatus] = useState<string>(initialInstance?.evolution_status || 'disconnected');
  const [connectedPhone, setConnectedPhone] = useState<string>(initialInstance?.evolution_phone || '');

  const [loading, setLoading] = useState(false);
  const [refreshingQR, setRefreshingQR] = useState(false);
  const [isSuccess, setIsSuccess] = useState(initialInstance?.evolution_status === 'open');
  const [error, setError] = useState('');

  const pollIntervalRef = useRef<any>(null);

  // Format base64 to data URI if needed
  const qrImageSrc = qrCode
    ? qrCode.startsWith('data:image')
      ? qrCode
      : `data:image/png;base64,${qrCode}`
    : '';

  // 1. Create instance and get initial QR
  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please provide a name for this phone connection.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await evolutionApi.createScannedInstance(displayName.trim());
      setActiveInstance(res.data.instance);
      setQrCode(res.data.qr_code || '');
      setStatus(res.data.status || 'connecting');

      // Immediately notify parent so the instance appears in the list without waiting or refreshing
      if (onInstanceCreated && res.data.instance) {
        onInstanceCreated(res.data.instance);
      }

      if (res.data.status === 'open') {
        setIsSuccess(true);
      } else if (!res.data.qr_code) {
        setError('Evolution API service is not reachable. Please check EVOLUTION_API_URL and EVOLUTION_API_KEY in backend/.env.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to connect to Evolution API server. Please ensure Evolution API is running and reachable.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Refresh QR code
  const handleRefreshQR = async (overrideId?: string) => {
    const targetId = overrideId || activeInstance?.id;
    if (!targetId) return;

    setRefreshingQR(true);
    setError('');
    try {
      const res = await evolutionApi.rescanInstance(targetId);
      setQrCode(res.data.qr_code || '');
      setStatus(res.data.status);
      if (res.data.status === 'open') {
        setIsSuccess(true);
      } else {
        toast.success('QR Code refreshed');
      }
    } catch {
      try {
        const fallback = await evolutionApi.getInstanceQR(targetId);
        setQrCode(fallback.data.qr_code || '');
        setStatus(fallback.data.status);
      } catch (err) {
        toast.error('Could not refresh QR code');
      }
    } finally {
      setRefreshingQR(false);
    }
  };

  // 3. Live polling for connection status
  useEffect(() => {
    if (!activeInstance || isSuccess) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await evolutionApi.getInstanceStatus(activeInstance.id);
        const newStatus = res.data.status;
        setStatus(newStatus);
        if (res.data.phone) {
          setConnectedPhone(res.data.phone);
        }

        if (newStatus === 'open') {
          setIsSuccess(true);
          toast.success('WhatsApp device paired successfully!');
          clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1800);
        }
      } catch {
        // Silent poll error
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeInstance, isSuccess, onSuccess, onClose]);

  // Sync with initialInstance props
  useEffect(() => {
    if (initialInstance) {
      setActiveInstance(initialInstance);
      setDisplayName(initialInstance.display_name || '');
      setQrCode(initialInstance.evolution_qr_code || '');
      setStatus(initialInstance.evolution_status || 'disconnected');
      setIsSuccess(initialInstance.evolution_status === 'open');

      // Fetch fresh QR code if not already open
      if (initialInstance.evolution_status !== 'open') {
        handleRefreshQR(initialInstance.id);
      }
    }
  }, [initialInstance]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60">
              <QrCode className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Link WhatsApp Device
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan the QR code with your phone to connect.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Enter Display Name if not initialized */}
          {!activeInstance ? (
            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Support Phone, Sales Line"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                  autoFocus
                  required
                />
              </div>

              {/* Info note */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span>Connects via WhatsApp Web. Separate from Meta Cloud API lines.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#007e3a] hover:bg-[#006830] text-white text-xs font-medium rounded-xl transition shadow-sm hover:shadow disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue to QR Code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : isSuccess ? (
            /* Connected Celebration */
            <div className="py-8 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Device Connected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {connectedPhone ? (
                  <>Connected line: <strong className="text-slate-800 dark:text-slate-200">{connectedPhone}</strong></>
                ) : (
                  'Your phone is now connected and messages will sync in real time.'
                )}
              </p>
            </div>
          ) : (
            /* STEP 2: Scan QR Screen */
            <div className="space-y-5">
              <div className="flex flex-col items-center justify-center">
                {qrImageSrc ? (
                  <div className="relative p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                    <img
                      src={qrImageSrc}
                      alt="WhatsApp Web QR Code"
                      className="w-56 h-56 object-contain rounded-xl"
                    />
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Waiting for camera scan...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-56 h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium">Generating QR Code...</span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  How to link:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-xs">
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings</strong> or <strong>Menu</strong> → <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point your camera here</li>
                </ol>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleRefreshQR()}
                  disabled={refreshingQR}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingQR ? 'animate-spin text-emerald-600' : ''}`} />
                  Refresh QR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-medium rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

