import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Deal, PipelineStage, PipelineField } from '../../pipeline/api';
import { DealFormData } from '../types';


interface EditDealModalProps {
  isOpen: boolean;
  deal: Deal | null; // null if adding new deal
  stages: PipelineStage[];
  contacts: any[];
  allPipelineFields: PipelineField[];
  selectedPipelineId: string;
  onClose: () => void;
  onSave: (data: DealFormData) => Promise<boolean>;
}

export function EditDealModal({
  isOpen,
  deal,
  stages,
  contacts,
  allPipelineFields,
  selectedPipelineId,
  onClose,
  onSave,
}: EditDealModalProps) {
  const [form, setForm] = useState<DealFormData>({
    name: '',
    value: 0,
    pipeline: selectedPipelineId,
    stage: stages[0]?.id || '',
    wa_contact: '',
    manual_contact: '',
    note: '',
    extra_data: {},
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deal) {
      setForm({
        id: deal.id,
        name: deal.name || '',
        value: deal.value || 0,
        pipeline: deal.pipeline || selectedPipelineId,
        stage: deal.stage || stages[0]?.id || '',
        wa_contact: deal.wa_contact || '',
        manual_contact: deal.manual_contact || '',
        note: deal.note || '',
        extra_data: { ...(deal.extra_data || {}) },
      });
    } else {
      setForm({
        name: '',
        value: 0,
        pipeline: selectedPipelineId,
        stage: stages[0]?.id || '',
        wa_contact: '',
        manual_contact: '',
        note: '',
        extra_data: {},
      });
    }
  }, [deal, stages, selectedPipelineId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Deal name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(form);
    setSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {deal ? 'Edit Deal' : 'Add New Deal'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {deal ? 'Update deal details and contact information' : 'Create a new deal in the current pipeline'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Deal Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deal Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Website Redesign Project"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  disabled={saving}
                  required
                />
              </div>

              {/* Deal Value */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deal Value (₹)
                </label>
                <input
                  type="number"
                  value={form.value}
                  onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  disabled={saving}
                />
              </div>

              {/* Stage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pipeline Stage
                </label>
                <select
                  value={form.stage}
                  onChange={e => setForm({ ...form, stage: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  disabled={saving}
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} {s.is_confirmed ? '(Confirmed)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* WhatsApp Contact Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Contact (Optional)
                </label>
                <select
                  value={form.wa_contact || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const selected = contacts.find(c => String(c.id) === String(val));
                    setForm({
                      ...form,
                      wa_contact: val || null,
                      manual_contact: val && selected ? selected.name || selected.phone : form.manual_contact,
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  disabled={saving}
                >
                  <option value="">-- No WhatsApp Contact --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} (${c.phone})` : c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual Contact Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact / Customer Name
                </label>
                <input
                  type="text"
                  value={form.manual_contact || ''}
                  onChange={e => setForm({ ...form, manual_contact: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Dynamic Custom Fields */}
            {allPipelineFields.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Custom Fields
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allPipelineFields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {f.type === 'select' && f.options && f.options.length > 0 ? (
                        <select
                          value={form.extra_data?.[f.key] || ''}
                          onChange={e => setForm({
                            ...form,
                            extra_data: { ...form.extra_data, [f.key]: e.target.value }
                          })}
                          disabled={saving}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                        >
                          <option value="">-- Select --</option>
                          {f.options.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                          value={form.extra_data?.[f.key] || ''}
                          onChange={e => setForm({
                            ...form,
                            extra_data: { ...form.extra_data, [f.key]: e.target.value }
                          })}
                          disabled={saving}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={form.note || ''}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Add notes about this deal..."
                className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007e3a] resize-y"
                disabled={saving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#007e3a] hover:bg-[#006830] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : deal ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
