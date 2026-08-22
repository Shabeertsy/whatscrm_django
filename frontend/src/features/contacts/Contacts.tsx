import React, { useState } from 'react';
import { Search, MessageSquare, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { useContacts } from './hooks/useContacts';
import { ContactForm } from './components/ContactForm';
import { ContactTable } from './components/ContactTable';
import { WAImportModal } from './components/WAImportModal';
import { Contact } from './utils/types';
import ConfirmDialog from '../../components/shared/ConfirmDialog';



export function Contacts() {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showWAImport, setShowWAImport] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState('');

  const {
    contacts, tags, loading, page, setPage, totalCount, pageSize,
    handleSaved, handleDelete,
    handleTagCreated, handleTagDeleted,
    handleWAImported,
  } = useContacts(search, filterTag, filterStatus, filterSource);

  const totalPages = Math.ceil(totalCount / pageSize);

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingContact(null);
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (deleteContactId) {
      await handleDelete(deleteContactId);
      setDeleteContactId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts & Leads"
        description="Manage your customer entries, tags, and marketing opt-ins."
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowWAImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#007e3a]/30 text-[#007e3a] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-xs font-semibold rounded-lg transition-colors"
          >
            <MessageSquare className="h-4 w-4" /> Import from WhatsApp
          </button>
          <button
            onClick={() => { setEditingContact(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-5 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Add Contact
          </button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {/* Filters bar */}
        <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800">
          <div className="flex-1 min-w-[240px] relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#007e3a] transition-colors" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a] transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterTag} onChange={e => setFilterTag(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
            >
              <option value="">All Tags</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select
              value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual Entry</option>
              <option value="whatsapp">WhatsApp Import</option>
              <option value="csv">CSV Upload</option>
            </select>
          </div>
        </div>

        {/* Contacts table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden">
          <ContactTable
            contacts={contacts}
            loading={loading}
            onEdit={openEditForm}
            onDelete={(id) => setDeleteContactId(id)}
          />
        </div>
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{contacts.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> contacts
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
              <span className="text-[13px] text-slate-600 dark:text-slate-400 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          )}
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

      <ConfirmDialog
        isOpen={!!deleteContactId}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteContactId(null)}
      />
    </div>
  );
}

export default Contacts;
