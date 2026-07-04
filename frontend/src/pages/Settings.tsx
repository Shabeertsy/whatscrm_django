import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  MessageSquare,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { whatsappApi } from '../api/whatsapp';
import type { WhatsappInstance, WhatsappInstancePayload } from '../types/whatsapp';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar tab definition
// ─────────────────────────────────────────────────────────────────────────────
type SettingsTab = 'whatsapp';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp Instances',
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form field
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          type={isPassword && !showPwd ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/40 focus:border-[#007e3a] transition"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / Edit Modal
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM: WhatsappInstancePayload = {
  display_name: '',
  phone_number_id: '',
  whatsapp_business_account_id: '',
  access_token: '',
  webhook_verify_token: '',
};

function InstanceModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: WhatsappInstance | null;
  onClose: () => void;
  onSave: (payload: WhatsappInstancePayload) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<WhatsappInstancePayload>(
    initial
      ? {
          display_name: initial.display_name,
          phone_number_id: initial.phone_number_id,
          whatsapp_business_account_id: initial.whatsapp_business_account_id,
          access_token: initial.access_token ?? '',
          webhook_verify_token: initial.webhook_verify_token ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof WhatsappInstancePayload) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Failed to save. Please check your inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#007e3a]/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-[#007e3a]" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Instance' : 'New WhatsApp Instance'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField
            label="Display Name"
            name="display_name"
            value={form.display_name}
            onChange={set('display_name')}
            placeholder="e.g. Sales Line, Support"
            required
          />
          <FormField
            label="Phone Number ID"
            name="phone_number_id"
            value={form.phone_number_id}
            onChange={set('phone_number_id')}
            placeholder="From Meta Developer Console"
            hint="Found under WhatsApp → Getting Started in your Meta App"
            required
          />
          <FormField
            label="WhatsApp Business Account ID (WABA)"
            name="whatsapp_business_account_id"
            value={form.whatsapp_business_account_id}
            onChange={set('whatsapp_business_account_id')}
            placeholder="Business Account ID"
            required
          />
          <FormField
            label="Access Token"
            name="access_token"
            type="password"
            value={form.access_token}
            onChange={set('access_token')}
            placeholder="Permanent or temporary Meta access token"
            hint="Use a System User token for production. Keep this secret."
            required={!isEdit}
          />
          <FormField
            label="Webhook Verify Token"
            name="webhook_verify_token"
            value={form.webhook_verify_token ?? ''}
            onChange={set('webhook_verify_token')}
            placeholder="Your custom verify token for webhook validation"
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#007e3a] hover:bg-[#00602d] rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Instances Tab
// ─────────────────────────────────────────────────────────────────────────────
function WhatsappInstancesTab() {
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WhatsappInstance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchInstances = async () => {
    try {
      const res = await whatsappApi.listInstances();
      const data = res.data;
      setInstances(Array.isArray(data) ? data : (data as any).results ?? []);
    } catch {
      /* silent – error state shown via empty list */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleSave = async (payload: WhatsappInstancePayload) => {
    if (editTarget) {
      await whatsappApi.updateInstance(editTarget.id, payload);
    } else {
      await whatsappApi.createInstance(payload);
    }
    await fetchInstances();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this WhatsApp instance? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await whatsappApi.deleteInstance(id);
      setInstances((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await whatsappApi.toggleActive(id);
      setInstances((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_active: res.data.is_active } : i))
      );
    } finally {
      setTogglingId(null);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (instance: WhatsappInstance) => {
    setEditTarget(instance);
    setModalOpen(true);
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            WhatsApp Instances
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect your Meta / WhatsApp Business API credentials to send and receive messages.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-sm font-semibold rounded-lg transition"
        >
          <Plus className="h-4 w-4" />
          Add Instance
        </button>
      </div>

      {/* Instance list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#007e3a]" />
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">No instances yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Click <strong>"Add Instance"</strong> to connect your first WhatsApp Business number.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:border-slate-200 dark:hover:border-slate-700"
            >
              {/* Icon + Info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${inst.is_active ? 'bg-[#007e3a]/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <MessageSquare className={`h-5 w-5 ${inst.is_active ? 'text-[#007e3a]' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {inst.display_name}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${inst.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {inst.is_active ? (
                        <><CheckCircle2 className="h-3 w-3" /> Active</>
                      ) : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                    Phone ID: {inst.phone_number_id}
                  </p>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    WABA: {inst.whatsapp_business_account_id}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Toggle active */}
                <button
                  onClick={() => handleToggle(inst.id)}
                  disabled={togglingId === inst.id}
                  title={inst.is_active ? 'Deactivate' : 'Activate'}
                  className="p-2 rounded-lg text-slate-400 hover:text-[#007e3a] hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                >
                  {togglingId === inst.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : inst.is_active ? (
                    <ToggleRight className="h-5 w-5 text-[#007e3a]" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>

                {/* Edit */}
                <button
                  onClick={() => openEdit(inst)}
                  title="Edit"
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(inst.id)}
                  disabled={deletingId === inst.id}
                  title="Delete"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  {deletingId === inst.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <InstanceModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Settings Page
// ─────────────────────────────────────────────────────────────────────────────
export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('whatsapp');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-[#007e3a]" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your integrations, preferences, and account configuration.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar navigation */}
        <nav className="w-full md:w-56 flex-shrink-0 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-h-[400px]">
          {activeTab === 'whatsapp' && <WhatsappInstancesTab />}
        </div>
      </div>
    </div>
  );
}

export default Settings;
