import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { whatsappApi } from "../../../api/whatsapp";
import type { WhatsappInstance } from "../../../types/whatsapp";


interface StartChatModalProps {
  onClose: () => void;
  onSubmit: (data: { phone: string; instance_id: string; template_name: string; template_language: string; body: string; name: string; save_contact: boolean }) => Promise<void>;
}

export function StartChatModal({ onClose, onSubmit }: StartChatModalProps) {
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    instance_id: "",
    template_id: "",
    save_contact: false,
  });

  useEffect(() => {
    Promise.all([
      whatsappApi.listInstances(),
      whatsappApi.listTemplates()
    ]).then(([instRes, tmplRes]) => {
      setInstances(instRes.data.filter(i => i.is_active));
      setTemplates(tmplRes.data.filter(t => t.status === "APPROVED"));
      
      const activeInstances = instRes.data.filter(i => i.is_active);
      if (activeInstances.length > 0) {
        setForm(f => ({ ...f, instance_id: activeInstances[0].id }));
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || !form.instance_id || !form.template_id) return;
    
    setSubmitting(true);
    try {
      const selectedTmpl = templates.find(t => t.id === form.template_id);
      
      const headerText = selectedTmpl.components?.find((c: any) => c.type === 'HEADER')?.text;
      const bodyText = selectedTmpl.components?.find((c: any) => c.type === 'BODY')?.text || '';
      const footerText = selectedTmpl.components?.find((c: any) => c.type === 'FOOTER')?.text;
      
      let previewText = `[Template: ${selectedTmpl.name}]\n`;
      if (headerText) previewText += `*${headerText}*\n\n`;
      previewText += bodyText;
      if (footerText) previewText += `\n\n_${footerText}_`;

      await onSubmit({
        phone: form.phone,
        instance_id: form.instance_id,
        template_name: selectedTmpl.name,
        template_language: selectedTmpl.language,
        body: previewText,
        name: form.name,
        save_contact: form.save_contact
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Start New Chat</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-[#007e3a] animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all text-slate-900 dark:text-slate-100"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number *
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/[^0-9+]/g, '') })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all text-slate-900 dark:text-slate-100"
                placeholder="e.g. +919876543210"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1.5">Include country code. Example: +91 for India</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                WhatsApp Instance
              </label>
              <div className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium cursor-not-allowed">
                {instances.find(i => i.id === form.instance_id)?.display_name || "No active instance found"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Template Message *
              </label>
              <select
                value={form.template_id}
                onChange={e => setForm({ ...form, template_id: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all text-slate-900 dark:text-slate-100"
                required
              >
                <option value="">Select an Approved Template</option>
                {templates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.language})
                  </option>
                ))}
              </select>
            </div>

            {form.template_id && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                  {(() => {
                    const t = templates.find(t => t.id === form.template_id);
                    if (!t) return "";
                    const h = t.components?.find((c: any) => c.type === 'HEADER')?.text;
                    const b = t.components?.find((c: any) => c.type === 'BODY')?.text || '';
                    const f = t.components?.find((c: any) => c.type === 'FOOTER')?.text;
                    let p = '';
                    if (h) p += `*${h}*\n\n`;
                    p += b;
                    if (f) p += `\n\n_${f}_`;
                    return p;
                  })()}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer mt-2 group">
              <input
                type="checkbox"
                checked={form.save_contact}
                onChange={e => setForm({ ...form, save_contact: e.target.checked })}
                className="w-4 h-4 rounded text-[#007e3a] focus:ring-[#007e3a] border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Save contact to CRM
              </span>
            </label>

            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#007e3a] hover:bg-[#00662f] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Sending..." : "Start Chat"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
