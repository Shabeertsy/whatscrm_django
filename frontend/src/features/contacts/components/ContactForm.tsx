import React, { useState, useEffect } from 'react';
import { CTag, Contact } from '../utils/types';
import { contactsApi } from '../../../api/contacts';
import { Loader2, Check, X, Plus } from 'lucide-react';
import { TagBadge } from './TagBadge';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  tags: CTag[];
  onSaved: (c: Contact) => void;
  editingContact: Contact | null;
}

export function ContactForm({ isOpen, onClose, tags, onSaved, editingContact }: ContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name);
      setPhone(editingContact.phone);
      setEmail(editingContact.email);
      setNotes(editingContact.notes || '');
      setSelectedTagIds(editingContact.tags.map(t => t.id));
    } else {
      setName(''); setPhone(''); setEmail(''); setNotes(''); setSelectedTagIds([]);
    }
  }, [editingContact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSaving(true);
    try {
      const payload = { name, phone, email, notes, tag_ids: selectedTagIds };
      const res = editingContact
        ? await contactsApi.updateContact(editingContact.id, payload)
        : await contactsApi.createContact(payload);
      onSaved(res.data);
      if (!editingContact) { setName(''); setPhone(''); setEmail(''); setNotes(''); setSelectedTagIds([]); }
      onClose();
    } catch {}
    setSaving(false);
  };

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', value: name, set: setName, type: 'text', placeholder: 'e.g. John Doe', required: true },
              { label: 'Phone Number', value: phone, set: setPhone, type: 'tel', placeholder: '+91 9876543210', required: true },
              { label: 'Email Address', value: email, set: setEmail, type: 'email', placeholder: 'john@example.com', required: false },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">{f.label}</label>
                <input
                  type={f.type} value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder} required={f.required}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
                />
              </div>
            ))}

            <div>
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map(tag => (
                  <TagBadge key={tag.id} tag={tag} onRemove={() => setSelectedTagIds(ids => ids.filter(id => id !== tag.id))} />
                ))}
              </div>
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map(tag => (
                    <button key={tag.id} type="button"
                      onClick={() => setSelectedTagIds(ids => [...ids, tag.id])}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-dashed text-slate-500 hover:border-[#007e3a] hover:text-[#007e3a] transition"
                    >
                      <Plus className="h-3 w-3" /> {tag.name}
                    </button>
                  ))}
                </div>
              )}
              {tags.length === 0 && <p className="text-[11px] text-slate-400">Create tags from the Tags panel first.</p>}
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder="Optional notes..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a] resize-none"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button type="submit" form="contact-form" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#007e3a] hover:bg-[#00602d] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {editingContact ? 'Save Changes' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
