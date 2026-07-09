import React, { useState, useEffect } from 'react';
import { Contact, WAContact } from '../utils/types';
import { contactsApi } from '../../../api/contacts';
import { MessageSquare, X, Phone, Loader2, Download } from 'lucide-react';

interface WAImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (contacts: Contact[]) => void;
}

export function WAImportModal({ isOpen, onClose, onImported }: WAImportModalProps) {
  const [waContacts, setWaContacts] = useState<WAContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    contactsApi.getWAContacts()
      .then(r => { setWaContacts(r.data); setSelected(new Set()); })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const toggle = (wa_id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(wa_id) ? next.delete(wa_id) : next.add(wa_id);
    return next;
  });

  const toggleAll = () =>
    setSelected(selected.size === waContacts.length ? new Set() : new Set(waContacts.map(c => c.wa_id)));

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const res = await contactsApi.importWAContacts(Array.from(selected));
      onImported(res.data.imported);
      onClose();
    } catch {}
    setImporting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#007e3a]" /> Import from WhatsApp Chats
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#007e3a]" />
              <span className="text-sm text-slate-500">Loading WhatsApp contacts...</span>
            </div>
          ) : waContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <MessageSquare className="h-12 w-12 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400">No new WhatsApp contacts to import.</p>
              <p className="text-xs text-slate-400">All chat contacts have already been imported.</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 font-semibold">
                  <input
                    type="checkbox"
                    checked={selected.size === waContacts.length}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded accent-[#007e3a]"
                  />
                  Select all ({waContacts.length})
                </label>
                <span className="text-xs text-slate-400">{selected.size} selected</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {waContacts.map(c => (
                  <label
                    key={c.wa_id}
                    className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.wa_id)}
                      onChange={() => toggle(c.wa_id)}
                      className="h-3.5 w-3.5 rounded accent-[#007e3a] flex-shrink-0"
                    />
                    <div className="h-9 w-9 rounded-full bg-[#007e3a]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {c.profile_pic_url
                        ? <img src={c.profile_pic_url} className="h-full w-full object-cover" alt="" />
                        : <span className="text-sm font-bold text-[#007e3a]">{(c.name || c.phone)[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" />{c.phone}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded flex-shrink-0">
                      {c.source}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleImport}
            disabled={importing || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#007e3a] hover:bg-[#00602d] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {selected.size > 0
              ? `Import ${selected.size} Contact${selected.size > 1 ? 's' : ''}`
              : 'Select contacts to import'}
          </button>
        </div>
      </div>
    </div>
  );
}
