import React from 'react';
import { Contact } from '../utils/types';
import { TagBadge } from './TagBadge';
import { Phone, Mail, Pencil, Trash2, Users, Loader2, MessageSquare } from 'lucide-react';



interface ContactTableProps {
  contacts: Contact[];
  loading: boolean;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}

export function ContactTable({ contacts, loading, onEdit, onDelete }: ContactTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#007e3a]" />
        <span className="text-sm text-slate-500">Loading contacts...</span>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Users className="h-12 w-12 text-slate-200 dark:text-slate-700" />
        <p className="text-sm text-slate-400">No contacts found. Add one using the form.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {['Name', 'Phone', 'Email', 'Tags', 'Status', ''].map(h => (
            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
        {contacts.map(c => (
          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                {c.wa_id && (
                  <span title="Imported from WhatsApp">
                    <MessageSquare className="h-3 w-3 text-[#007e3a]" />
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />{c.phone}
              </span>
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
              {c.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />{c.email}
                </span>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {c.tags.map(t => <TagBadge key={t.id} tag={t} />)}
              </div>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.status}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2 transition">
                <button onClick={() => onEdit(c)} className="text-slate-400 hover:text-[#007e3a] transition">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(c.id)} className="text-slate-400 hover:text-red-500 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
