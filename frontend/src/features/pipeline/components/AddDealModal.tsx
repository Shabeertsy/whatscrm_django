import React from "react";
import { X } from "lucide-react";

interface Props {
  contacts: any[];
  initialData?: { id?: string; name: string; value: number; wa_contact?: string; note?: string };
  onClose: () => void;
  onSubmit: (data: { id?: string; name: string; value: number; wa_contact?: string; note?: string }) => Promise<boolean>;
}

export function AddDealModal({ contacts, initialData, onClose, onSubmit }: Props) {
  const [form, setForm] = React.useState({
    name: initialData?.name || "",
    value: initialData?.value || 0,
    wa_contact: initialData?.wa_contact || "",
    note: initialData?.note || ""
  });

  const handleSubmit = async () => {
    const ok = await onSubmit({
      id: initialData?.id,
      name: form.name,
      value: Number(form.value),
      wa_contact: form.wa_contact || undefined,
      note: form.note || undefined,
    });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{initialData ? "Edit Deal" : "Add New Deal"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Associated Contact</label>
            <select
              value={form.wa_contact}
              onChange={e => setForm({ ...form, wa_contact: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
            >
              <option value="">-- Select Contact (Optional) --</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.phone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Note (Optional)</label>
            <textarea
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a] min-h-[80px]"
              placeholder="Additional details..."
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-sm font-bold rounded-lg">
            {initialData ? "Save Changes" : "Create Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}
