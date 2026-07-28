import React, { useState } from 'react';
import { MessageSquare, X, AlertTriangle, Loader2 } from 'lucide-react';
import type { WhatsappInstance, WhatsappInstancePayload } from '../../../../types/whatsapp';
import { FormField } from '../ui/FormField';

const EMPTY_FORM: WhatsappInstancePayload = {
  display_name: '',
  phone_number_id: '',
  whatsapp_business_account_id: '',
  access_token: '',
  webhook_verify_token: '',
};

export function InstanceModal({
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
      setError('Failed to save instance credentials. Please verify details.');
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
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="h-4.5 w-4.5 text-[#007e3a] dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit WhatsApp Instance' : 'New WhatsApp Instance'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Meta Cloud API credentials setup</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <FormField
            label="Display Name"
            name="display_name"
            value={form.display_name}
            onChange={set('display_name')}
            placeholder="e.g. Sales Line, Customer Support"
            required
          />
          <FormField
            label="Phone Number ID"
            name="phone_number_id"
            value={form.phone_number_id}
            onChange={set('phone_number_id')}
            placeholder="From Meta Developer Console"
            hint="Found under WhatsApp → Getting Started in your Meta App Dashboard"
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
            placeholder="Permanent or System User Meta access token"
            hint="Use a System User token for production reliability. Secrets are encrypted."
            required={!isEdit}
          />
          <FormField
            label="Webhook Verify Token"
            name="webhook_verify_token"
            value={form.webhook_verify_token ?? ''}
            onChange={set('webhook_verify_token')}
            placeholder="Your custom verify token for Meta Webhook verification"
          />

          {error && (
            <div className="flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#007e3a] hover:bg-[#00602d] rounded-xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-60"
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
