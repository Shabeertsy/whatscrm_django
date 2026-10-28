import React, { useState, useEffect, useMemo } from "react";
import { X, Copy, Phone } from "lucide-react";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { PipelineField, StageField, PipelineStage } from "../api";
import type { AssignableAgent } from "../../../api/messaging";
import toast from "react-hot-toast";


interface Props {
  contacts: any[];
  initialData?: {
    id?: string;
    name: string;
    value: number;
    wa_contact?: string | null;
    manual_contact?: string | null;
    note?: string | null;
    extra_data?: Record<string, any>;
    stage?: string;
    assigned_user?: { id: string; name: string; email?: string } | null;
    chat_started_at?: string | null;
  };
  extraFields?: PipelineField[];
  stageFields?: StageField[];
  stages?: PipelineStage[];
  agents?: AssignableAgent[];
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    name: string;
    value: number;
    wa_contact?: string | null;
    manual_contact?: string | null;
    note?: string | null;
    extra_data?: Record<string, any>;
    stage?: string;
    assigned_agent?: string | null;
  }) => Promise<boolean>;
  onDelete?: () => void;
}

export function AddDealModal({ contacts, initialData, extraFields, stageFields, stages, agents = [], onClose, onSubmit, onDelete }: Props) {
  const fields = useMemo(() => {
    const list = [...(extraFields || []), ...(stageFields || [])];
    const map = new Map<string, PipelineField>();
    for (const f of list) {
      if (f && f.key && !map.has(f.key)) {
        map.set(f.key, f);
      }
    }
    return Array.from(map.values());
  }, [extraFields, stageFields]);

  const [form, setForm] = useState({
    name: initialData?.name || "",
    value: initialData?.value || 0,
    stage: initialData?.stage || (stages && stages[0]?.id) || "",
    wa_contact: initialData?.wa_contact || "",
    manual_contact: initialData?.manual_contact || "",
    note: initialData?.note || "",
    assigned_agent: initialData?.assigned_user?.id || "",
  });
  const [extraData, setExtraData] = useState<Record<string, any>>(initialData?.extra_data || {});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setForm({
      name: initialData?.name || "",
      value: initialData?.value || 0,
      stage: initialData?.stage || (stages && stages[0]?.id) || "",
      wa_contact: initialData?.wa_contact || "",
      manual_contact: initialData?.manual_contact || "",
      note: initialData?.note || "",
      assigned_agent: initialData?.assigned_user?.id || "",
    });
    setExtraData(initialData?.extra_data || {});
  }, [initialData, stages]);

  const handleSubmit = async () => {
    for (const field of fields) {
      if (field.required && (!extraData[field.key] || String(extraData[field.key]).trim() === '')) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    const ok = await onSubmit({
      id: initialData?.id,
      name: form.name.trim(),
      value: Number(form.value) || 0,
      stage: form.stage || undefined,
      wa_contact: form.wa_contact || undefined,
      manual_contact: form.manual_contact?.trim() ?? "",
      note: form.note?.trim() ?? "",
      extra_data: Object.keys(extraData).length > 0 ? extraData : undefined,
      assigned_agent: form.assigned_agent || null,
    });
    if (ok) onClose();
  };

  const selectedContact = contacts.find(c => String(c.id) === String(form.wa_contact));

  const handleCopyPhone = () => {
    if (selectedContact?.phone) {
      navigator.clipboard.writeText(selectedContact.phone);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md md:max-w-2xl lg:max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{initialData ? "Edit Deal" : "Add New Deal"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {initialData?.chat_started_at && (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">Chat Started:</span>
              <span className="font-mono">
                {new Date(initialData.chat_started_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deal Name *</label>
              <input
                type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                placeholder="e.g. New deal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deal Value (₹)</label>
              <input
                type="number" value={form.value}
                onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
              />
            </div>
            {stages && stages.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Stage</label>
                <select
                  value={form.stage}
                  onChange={e => setForm({ ...form, stage: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} {s.is_confirmed ? '(Confirmed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned User</label>
              <select
                value={form.assigned_agent}
                onChange={e => setForm({ ...form, assigned_agent: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
              >
                <option value="">-- Unassigned --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.email} {a.user_type ? `(${a.user_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact (WhatsApp)</label>
              <select
                value={form.wa_contact}
                onChange={e => setForm({ ...form, wa_contact: e.target.value })}
                disabled={!!initialData}
                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a] disabled:opacity-60 disabled:cursor-not-allowed ${initialData ? 'appearance-none' : ''}`}
              >
                <option value="">-- Select Contact (Optional) --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.phone}</option>
                ))}
              </select>
            </div>

            {selectedContact && selectedContact.phone ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedContact.phone}
                    readOnly
                    className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed outline-none"
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); handleCopyPhone(); }}
                    title="Copy Phone Number"
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={`tel:${selectedContact.phone}`}
                    title="Call Contact"
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#007e3a] transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ) : null}

            <div className={selectedContact && selectedContact.phone ? "md:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manual Contact <span className="text-slate-400 font-normal">(Optional — name or phone)</span>
              </label>
              <input
                type="text"
                value={form.manual_contact}
                onChange={e => setForm({ ...form, manual_contact: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Note (Optional)</label>
              <textarea
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a] min-h-[70px]"
                placeholder="Additional details..."
              />
            </div>
          </div>

          {/* Dynamic Pipeline Extra Fields */}
          {fields.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Custom Deal Fields
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'select' && field.options ? (
                      <select
                        value={extraData[field.key] || ''}
                        onChange={e => setExtraData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                      >
                        <option value="">-- Select --</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={extraData[field.key] || ''}
                        onChange={e => setExtraData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        required={field.required}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          <div>
            {initialData && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-sm font-bold rounded-lg">
              {initialData ? "Save Changes" : "Create Deal"}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Deal"
        description="Are you sure you want to delete this deal?"
        confirmLabel="Delete Deal"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          if (onDelete) onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
