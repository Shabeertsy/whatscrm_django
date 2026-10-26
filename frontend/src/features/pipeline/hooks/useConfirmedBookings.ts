import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getPaginatedConfirmedBookings,
  deleteConfirmedBooking,
  updateConfirmedBooking,
  getPipelines,
  ConfirmedBooking,
  Pipeline,
} from '../api';
import {
  ExtraFieldColumn,
  BookingFieldConfig,
  EditingBookingFormData,
} from '../components/confirmed_bookings/types';


export function useConfirmedBookings() {
  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [serverTotalValue, setServerTotalValue] = useState(0);

  // Modal states
  const [viewingBooking, setViewingBooking] = useState<ConfirmedBooking | null>(null);
  const [editingBookingData, setEditingBookingData] = useState<EditingBookingFormData | null>(null);
  const [savingBooking, setSavingBooking] = useState(false);

  // Quick note modal state
  const [editingBookingNote, setEditingBookingNote] = useState<ConfirmedBooking | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [savingNote, setSavingNote] = useState(false);

  // 1. Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Initial pipelines fetch
  useEffect(() => {
    let isMounted = true;
    getPipelines()
      .then(pData => {
        if (!isMounted) return;
        setPipelines(pData);
        const active = pData.find(p => p.is_active);
        if (active) {
          setSelectedPipeline(active.name);
        } else if (pData.length > 0) {
          setSelectedPipeline(pData[0].name);
        }
      })
      .catch(() => toast.error('Failed to load pipelines'))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Fetch paginated confirmed bookings from backend
  const fetchBookings = useCallback(
    async (
      currentPage: number,
      currentPageSize: number,
      pipelineName: string,
      query: string
    ) => {
      setLoadingBookings(true);
      try {
        const res = await getPaginatedConfirmedBookings({
          page: currentPage,
          page_size: currentPageSize,
          pipeline: pipelineName,
          search: query,
        });

        setBookings(res.results || []);
        setTotalCount(res.count || 0);
        setTotalPages(res.total_pages || 1);
        setPage(res.current_page || currentPage);
        setServerTotalValue(res.total_value ?? 0);
      } catch {
        toast.error('Failed to load confirmed bookings');
      } finally {
        setLoadingBookings(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBookings(page, pageSize, selectedPipeline, debouncedSearch);
  }, [page, pageSize, selectedPipeline, debouncedSearch, fetchBookings]);

  // Unique pipeline names for selector
  const pipelineNames = useMemo(() => {
    const names = new Set([
      ...pipelines.map(p => p.name),
      ...bookings.map(b => b.confirmed_pipeline_name),
    ].filter(Boolean));
    return Array.from(names).sort();
  }, [bookings, pipelines]);

  const handlePipelineChange = (pipeline: string) => {
    setSelectedPipeline(pipeline);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  // Dynamic extra field columns derived from pipelines and booking extra_data
  const extraFieldColumns: ExtraFieldColumn[] = useMemo(() => {
    const map = new Map<string, string>();

    const relevantPipelines = selectedPipeline
      ? pipelines.filter(p => p.name === selectedPipeline)
      : pipelines;

    relevantPipelines.forEach(p => {
      (p.extra_fields || []).forEach(f => {
        if (f && f.key && !map.has(f.key)) {
          map.set(f.key, f.label || f.key);
        }
      });
      (p.stages || []).forEach(s => {
        (s.extra_fields || []).forEach(f => {
          if (f && f.key && !map.has(f.key)) {
            map.set(f.key, f.label || f.key);
          }
        });
      });
    });

    bookings.forEach(b => {
      if (b.extra_data && typeof b.extra_data === 'object') {
        Object.keys(b.extra_data).forEach(k => {
          if (!map.has(k)) {
            const pretty = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            map.set(k, pretty);
          }
        });
      }
    });

    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [bookings, pipelines, selectedPipeline]);

  // Helper to extract fields config for a single booking
  const getBookingFields = useCallback(
    (booking: ConfirmedBooking): BookingFieldConfig[] => {
      const relevantPipeline = pipelines.find(
        p => p.id === booking.pipeline || p.name === booking.confirmed_pipeline_name
      );
      const map = new Map<string, BookingFieldConfig>();

      if (relevantPipeline) {
        (relevantPipeline.extra_fields || []).forEach(f => {
          if (f && f.key) {
            map.set(f.key, {
              key: f.key,
              label: f.label || f.key,
              type: f.type || 'text',
              options: f.options,
            });
          }
        });
        (relevantPipeline.stages || []).forEach(s => {
          (s.extra_fields || []).forEach(f => {
            if (f && f.key && !map.has(f.key)) {
              map.set(f.key, {
                key: f.key,
                label: f.label || f.key,
                type: f.type || 'text',
                options: f.options,
              });
            }
          });
        });
      }

      if (booking.extra_data && typeof booking.extra_data === 'object') {
        Object.keys(booking.extra_data).forEach(k => {
          if (!map.has(k)) {
            map.set(k, {
              key: k,
              label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              type: 'text',
            });
          }
        });
      }

      return Array.from(map.values());
    },
    [pipelines]
  );

  // Deletion handler
  const handleDeleteBooking = async (booking: ConfirmedBooking) => {
    if (!window.confirm(`Delete confirmed booking for "${booking.name}"?`)) return;

    setDeletingId(booking.id);
    try {
      await deleteConfirmedBooking(booking.id);
      toast.success('Confirmed booking deleted');
      const newPage = bookings.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      fetchBookings(newPage, pageSize, selectedPipeline, debouncedSearch);
      if (viewingBooking?.id === booking.id) setViewingBooking(null);
      if (editingBookingData?.id === booking.id) setEditingBookingData(null);
    } catch {
      toast.error('Failed to delete confirmed booking');
    } finally {
      setDeletingId(null);
    }
  };

  // Editing handlers
  const handleOpenEdit = (booking: ConfirmedBooking) => {
    setEditingBookingData({
      id: booking.id,
      name: booking.deal_name || booking.name,
      value: booking.value,
      contact_name: booking.contact_name || '',
      contact_phone: booking.contact_phone || '',
      note: booking.note || '',
      extra_data: { ...(booking.extra_data || {}) },
      rawBooking: booking,
    });
  };

  const handleUpdateEditField = (field: string, value: any) => {
    setEditingBookingData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleUpdateEditExtraData = (key: string, value: any) => {
    setEditingBookingData(prev =>
      prev
        ? {
          ...prev,
          extra_data: { ...prev.extra_data, [key]: value },
        }
        : null
    );
  };

  const handleSaveBooking = async () => {
    if (!editingBookingData) return;
    if (!editingBookingData.name.trim()) {
      toast.error('Deal name is required');
      return;
    }
    setSavingBooking(true);
    try {
      const updated = await updateConfirmedBooking(editingBookingData.id, {
        name: editingBookingData.name.trim(),
        value: Number(editingBookingData.value) || 0,
        contact_name: editingBookingData.contact_name.trim(),
        contact_phone: editingBookingData.contact_phone.trim(),
        note: editingBookingData.note,
        extra_data: editingBookingData.extra_data,
      });

      setBookings(prev =>
        prev.map(b => (b.id === editingBookingData.id ? { ...b, ...updated } : b))
      );
      if (viewingBooking?.id === editingBookingData.id) {
        setViewingBooking(prev => (prev ? { ...prev, ...updated } : null));
      }
      toast.success('Confirmed booking updated');
      setEditingBookingData(null);
      fetchBookings(page, pageSize, selectedPipeline, debouncedSearch);
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setSavingBooking(false);
    }
  };

  // Note Modal handlers
  const handleOpenNoteModal = (booking: ConfirmedBooking) => {
    setEditingBookingNote(booking);
    setNoteText(booking.note || '');
  };

  const handleCloseNoteModal = () => {
    if (savingNote) return;
    setEditingBookingNote(null);
    setNoteText('');
  };

  const handleSaveNoteModal = async () => {
    if (!editingBookingNote) return;
    setSavingNote(true);
    try {
      await updateConfirmedBooking(editingBookingNote.id, { note: noteText });
      setBookings(prev =>
        prev.map(b => (b.id === editingBookingNote.id ? { ...b, note: noteText } : b))
      );
      if (viewingBooking?.id === editingBookingNote.id) {
        setViewingBooking(prev => (prev ? { ...prev, note: noteText } : null));
      }
      toast.success('Note updated');
      setEditingBookingNote(null);
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  return {
    bookings,
    filteredBookings: bookings,
    pipelineNames,
    selectedPipeline,
    setSelectedPipeline: handlePipelineChange,
    search,
    setSearch,
    loading: loading || loadingBookings,
    deletingId,
    totalValue: serverTotalValue,
    extraFieldColumns,
    getBookingFields,

    // Pagination
    page,
    pageSize,
    totalPages,
    totalCount,
    handlePageChange,
    handlePageSizeChange,

    // View Modal
    viewingBooking,
    setViewingBooking,

    // Edit Modal
    editingBookingData,
    setEditingBookingData,
    savingBooking,
    handleOpenEdit,
    handleUpdateEditField,
    handleUpdateEditExtraData,
    handleSaveBooking,

    // Delete
    handleDeleteBooking,

    // Note Modal
    editingBookingNote,
    noteText,
    setNoteText,
    savingNote,
    handleOpenNoteModal,
    handleCloseNoteModal,
    handleSaveNoteModal,
  };
}
