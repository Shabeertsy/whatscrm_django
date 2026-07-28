import React, { useState } from 'react';
import { Building2, X, AlertTriangle, Loader2 } from 'lucide-react';
import type { Department, DepartmentPayload } from '../../../../api/accounts';
import { FormField } from '../ui/FormField';

export function DepartmentModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Department | null;
  onClose: () => void;
  onSave: (payload: DepartmentPayload) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<DepartmentPayload>(
    initial
      ? { name: initial.name, description: initial.description ?? '', is_active: initial.is_active }
      : { name: '', description: '', is_active: true }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof DepartmentPayload) => (val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Failed to save department. Department name must be unique.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
              <Building2 className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit Department' : 'New Department'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Organizational team structure</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField
            label="Department Name"
            name="name"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Sales & Marketing, Customer Operations"
            required
          />
          <FormField
            label="Description (Optional)"
            name="description"
            value={form.description ?? ''}
            onChange={set('description')}
            placeholder="Overview of this department's responsibilities"
            isTextArea
          />
          {error && (
            <div className="flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#007e3a] hover:bg-[#00602d] rounded-xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
