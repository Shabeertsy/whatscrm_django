import React, { useState } from 'react';
import { Bot, X, AlertTriangle, Loader2 } from 'lucide-react';
import type { AiProviderConfig, AiProviderPayload } from '../../../../api/ai';
import { FormField } from '../ui/FormField';

export function AiProviderModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: AiProviderConfig | null;
  onClose: () => void;
  onSave: (payload: AiProviderPayload) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<AiProviderPayload>(
    initial
      ? {
          name: initial.name,
          ai_provider_name: initial.ai_provider_name,
          ai_provider_api_key: initial.ai_provider_api_key ?? '',
          ai_provider_secret_key: initial.ai_provider_secret_key ?? '',
        }
      : { name: '', ai_provider_name: 'openai', ai_provider_api_key: '', ai_provider_secret_key: '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof AiProviderPayload) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Failed to save AI Provider settings.');
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
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
              <Bot className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit AI Provider' : 'New AI Provider'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure LLM keys for automated AI agents</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField
            label="Provider Profile Name"
            name="name"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Primary OpenAI Key"
            required
          />
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Provider Service <span className="text-red-500">*</span>
            </label>
            <select
              value={form.ai_provider_name}
              onChange={(e) => set('ai_provider_name')(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition shadow-sm"
            >
              <option value="openai">OpenAI (GPT-4 / GPT-3.5)</option>
              <option value="claude">Anthropic Claude</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          <FormField
            label="API Key"
            name="ai_provider_api_key"
            type="password"
            value={form.ai_provider_api_key ?? ''}
            onChange={set('ai_provider_api_key')}
            placeholder="sk-..."
            required
          />
          <FormField
            label="Secret Key (Optional)"
            name="ai_provider_secret_key"
            type="password"
            value={form.ai_provider_secret_key ?? ''}
            onChange={set('ai_provider_secret_key')}
            placeholder="Additional organizational secret"
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
              {isEdit ? 'Save Changes' : 'Create Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
