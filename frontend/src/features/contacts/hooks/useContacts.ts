import { useState, useCallback, useEffect } from 'react';
import { contactsApi } from '../../../api/contacts';
import { Contact, CTag } from '../utils/types';



export function useContacts(search: string, filterTag: string, filterStatus: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<CTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterTag, filterStatus]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        contactsApi.getContacts({ search, tag: filterTag, status: filterStatus, page }),
        contactsApi.getTags(),
      ]);
      setContacts(cRes.data.results || []);
      setTotalCount(cRes.data.count || 0);
      setTags(tRes.data);
    } catch {}
    setLoading(false);
  }, [search, filterTag, filterStatus, page]);

  useEffect(() => { loadData(); }, [search, filterTag, filterStatus, page]);

  const refreshTags = () => contactsApi.getTags().then(r => setTags(r.data));

  const handleSaved = (saved: Contact) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === saved.id);
      return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
    });
    refreshTags();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await contactsApi.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setTotalCount(prev => prev - 1);
    } catch {}
  };

  const handleTagCreated = (tag: CTag) => setTags(prev => [...prev, tag]);

  const handleTagDeleted = async (id: string) => {
    try {
      await contactsApi.deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
      setContacts(prev => prev.map(c => ({ ...c, tags: c.tags.filter(t => t.id !== id) })));
    } catch {}
  };

  const handleWAImported = (imported: Contact[]) => {
    setContacts(prev => [...imported, ...prev]);
    setTotalCount(prev => prev + imported.length);
  };

  return {
    contacts, tags, loading, page, setPage, totalCount, pageSize,
    handleSaved, handleDelete,
    handleTagCreated, handleTagDeleted,
    handleWAImported,
  };
}

