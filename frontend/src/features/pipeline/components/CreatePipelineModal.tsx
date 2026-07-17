import React from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => Promise<boolean>;
}

export function CreatePipelineModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = React.useState({ name: "", description: "" });

  const handleSubmit = async () => {
    const ok = await onSubmit(form);
    if (ok) { setForm({ name: "", description: "" }); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create New Pipeline</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pipeline Name *</label>
            <input
              type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
              placeholder="e.g. WhatsApp Leads Pipeline"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a] min-h-[60px]"
              placeholder="What is this pipeline for?"
            />
          </div>
          <p className="text-xs text-slate-400">A default "Incoming Leads" stage will be created automatically.</p>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-sm font-bold rounded-lg">Create Pipeline</button>
        </div>
      </div>
    </div>
  );
}
