import React, { useState } from 'react';
import { Search, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { useContacts } from './hooks/useContacts';
import { ContactForm } from './components/ContactForm';
import { ContactTable } from './components/ContactTable';
import { TagManager } from './components/TagManager';
import { WAImportModal } from './components/WAImportModal';
import { Contact } from './utils/types';



export function Contacts() {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showWAImport, setShowWAImport] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    contacts, tags, loading, page, setPage, totalCount, pageSize,
    handleSaved, handleDelete,
    handleTagCreated, handleTagDeleted,
    handleWAImported,
  } = useContacts(search, filterTag, filterStatus);

  const totalPages = Math.ceil(totalCount / pageSize);

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingContact(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts & Leads"
        description="Manage your customer entries, tags, and marketing opt-ins."
      >
        <div className="flex gap-2">
          <button
            onClick={() => setShowWAImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#007e3a] text-[#007e3a] hover:bg-[#007e3a]/5 text-xs font-bold rounded-lg transition"
          >
            <MessageSquare className="h-4 w-4" /> Import from WhatsApp
          </button>
          <button
            onClick={() => { setEditingContact(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#007e3a] text-white hover:bg-[#00602d] text-xs font-bold rounded-lg transition"
          >
            Add Contact
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left column: table */}
        <div className="xl:col-span-3 space-y-4 order-2 xl:order-1">
          {/* Filters bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
              />
            </div>
            <select
              value={filterTag} onChange={e => setFilterTag(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a]"
            >
              <option value="">All Tags</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a]"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Contacts table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <ContactTable
              contacts={contacts}
              loading={loading}
              onEdit={openEditForm}
              onDelete={handleDelete}
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-400">
              Showing {contacts.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalCount)} of {totalCount} contacts
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: tags */}
        <div className="space-y-5 order-1 xl:order-2">
          <TagManager
            tags={tags}
            onCreated={handleTagCreated}
            onDeleted={handleTagDeleted}
          />
        </div>
      </div>

      <ContactForm
        isOpen={isFormOpen}
        onClose={closeForm}
        tags={tags}
        onSaved={c => { handleSaved(c); closeForm(); }}
        editingContact={editingContact}
      />

      <WAImportModal
        isOpen={showWAImport}
        onClose={() => setShowWAImport(false)}
        onImported={handleWAImported}
      />
    </div>
  );
}

export default Contacts;
