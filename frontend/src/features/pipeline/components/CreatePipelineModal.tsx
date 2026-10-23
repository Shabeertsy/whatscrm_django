import React, { useState } from "react";
import { X } from "lucide-react";
import { PipelineField } from "../api";
import { PipelineFieldsEditor } from "./PipelineFieldsEditor";

interface Props {
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; extra_fields?: PipelineField[] }) => Promise<boolean>;
}

export function CreatePipelineModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [extraFields, setExtraFields] = useState<PipelineField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        ...form,
        extra_fields: extraFields,
      });
      if (ok) {
        setForm({ name: "", description: "" });
        setExtraFields([]);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create New Pipeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">Set up pipeline details and custom deal fields</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pipeline Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
              placeholder="e.g. WhatsApp Leads Pipeline"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] min-h-[50px]"
              placeholder="What is this pipeline for?"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <PipelineFieldsEditor
              fields={extraFields}
              onChange={setExtraFields}
            />
          </div>

          <p className="text-xs text-slate-400 pt-1">
            A default "Incoming Leads" stage will be created automatically.
          </p>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim() || isSubmitting}
            className="px-5 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Creating..." : "Create Pipeline"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreatePipelineModal;
