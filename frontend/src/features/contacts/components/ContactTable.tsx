import React from 'react';
import { Contact } from '../utils/types';
import { Phone, Mail, Pencil, Trash2, Users, Loader2, MessageSquare, FileText, User } from 'lucide-react';

interface ContactTableProps {
  contacts: Contact[];
  loading: boolean;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}

export function ContactTable({ contacts, loading, onEdit, onDelete }: ContactTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-slate-900 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-[#007e3a]" />
        <span className="text-sm font-medium text-slate-500">Loading contacts...</span>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-dashed m-4">
        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No contacts found</h3>
          <p className="text-xs text-slate-500 max-w-sm">You haven't added any contacts yet, or none match your search criteria.</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
      'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
      'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
      'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="overflow-x-auto w-full custom-scrollbar">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
            <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tags / Stage</th>
            <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
          {contacts.map(c => {
            const displayName = c.name || c.phone || 'Unnamed';
            return (
              <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                <td className="px-6 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(displayName)}`}>
                      {c.name ? getInitials(c.name) : <User className="h-5 w-5 opacity-70" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-[13px]">
                        {displayName}
                        {c.wa_id && (
                          <span title="Imported from WhatsApp" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <MessageSquare className="h-3 w-3" />
                          </span>
                        )}
                        {c.source === 'csv' && (
                          <span title="Imported from CSV" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 uppercase tracking-wider">
                            <FileText className="h-2.5 w-2.5" />
                            CSV
                          </span>
                        )}
                      </div>
                      {c.email && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {c.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap">
                  <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {c.phone}
                  </div>
                </td>
                <td className="px-6 py-2.5">
                  {c.stage_name ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: c.stage_color }} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.stage_name}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded">No Stage</span>
                  )}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(c)} className="p-2 text-slate-400 hover:text-[#007e3a] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors" title="Edit Contact">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Delete Contact">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
