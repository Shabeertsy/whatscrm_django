import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getPipelines,
  getPaginatedDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  Pipeline,
  Deal,
  PipelineStage,
  PipelineField,
} from '../../pipeline/api';
import { apiClient } from '../../../api/client';
import {
  TimeframeOption,
  PipelineTableStatsData,
  ExtraFieldColumn,
  DealFormData,
} from '../types';


export function usePipelineTable() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Server aggregated stats
  const [serverStats, setServerStats] = useState({
    totalDeals: 0,
    totalValue: 0,
    confirmedCount: 0,
  });

  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modals state
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isAddingDeal, setIsAddingDeal] = useState(false);
  const [editingNoteDeal, setEditingNoteDeal] = useState<Deal | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // 1. Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Fetch pipelines and contacts on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [pipelinesData, contactsRes] = await Promise.all([
          getPipelines(),
          apiClient.get('/messaging/contacts/').catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        setPipelines(pipelinesData);
        setContacts(contactsRes.data?.results || contactsRes.data || []);

        const active = pipelinesData.find(p => p.is_active);
        const defaultPipeline = active ? active.id : pipelinesData[0]?.id || '';
        setSelectedPipelineId(defaultPipeline);
      } catch {
        toast.error('Failed to load pipelines');
      } finally {
        if (isMounted) setLoadingPipelines(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Fetch paginated deals from backend
  const fetchDeals = useCallback(
    async (
      pipelineId: string,
      currentPage: number,
      currentPageSize: number,
      stageId: string,
      searchTerm: string,
      tf: TimeframeOption
    ) => {
      if (!pipelineId) {
        setDeals([]);
        setTotalCount(0);
        setTotalPages(1);
        return;
      }
      setLoadingDeals(true);
      try {
        const res = await getPaginatedDeals({
          pipeline: pipelineId,
          page: currentPage,
          page_size: currentPageSize,
          stage: stageId,
          search: searchTerm,
          timeframe: tf,
        });

        setDeals(res.results || []);
        setTotalCount(res.count || 0);
        setTotalPages(res.total_pages || 1);
        setPage(res.current_page || currentPage);
        setServerStats({
          totalDeals: res.count || 0,
          totalValue: res.total_value ?? 0,
          confirmedCount: res.confirmed_count ?? 0,
        });
      } catch {
        toast.error('Failed to load deals for this pipeline');
      } finally {
        setLoadingDeals(false);
      }
    },
    []
  );

  // Trigger fetch when any filter or pagination parameter changes
  useEffect(() => {
    if (selectedPipelineId) {
      fetchDeals(selectedPipelineId, page, pageSize, selectedStageId, debouncedSearch, timeframe);
    }
  }, [selectedPipelineId, page, pageSize, selectedStageId, debouncedSearch, timeframe, fetchDeals]);

  // Reset to page 1 when primary filters change
  const handlePipelineChange = (id: string) => {
    setSelectedPipelineId(id);
    setPage(1);
  };

  const handleStageFilterChange = (stageId: string) => {
    setSelectedStageId(stageId);
    setPage(1);
  };

  const handleTimeframeChange = (tf: TimeframeOption) => {
    setTimeframe(tf);
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

  // Current active pipeline object
  const activePipeline = useMemo(() => {
    return pipelines.find(p => p.id === selectedPipelineId) || null;
  }, [pipelines, selectedPipelineId]);

  // Stages of the selected pipeline
  const stages: PipelineStage[] = useMemo(() => {
    return (activePipeline?.stages || []).slice().sort((a, b) => a.order - b.order);
  }, [activePipeline]);

  // Summary statistics across entire pipeline (from server)
  const stats: PipelineTableStatsData = useMemo(() => {
    const totalDeals = serverStats.totalDeals;
    const totalValue = serverStats.totalValue;
    const confirmedCount = serverStats.confirmedCount;
    const avgDealValue = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0;

    return { totalDeals, totalValue, confirmedCount, avgDealValue };
  }, [serverStats]);

  // Dynamic extra field columns for this pipeline
  const extraFieldColumns: ExtraFieldColumn[] = useMemo(() => {
    const map = new Map<string, string>();

    (activePipeline?.extra_fields || []).forEach(f => {
      if (f && f.key && !map.has(f.key)) {
        map.set(f.key, f.label || f.key);
      }
    });

    stages.forEach(s => {
      (s.extra_fields || []).forEach(f => {
        if (f && f.key && !map.has(f.key)) {
          map.set(f.key, f.label || f.key);
        }
      });
    });

    // Also check deals in view
    deals.forEach(d => {
      if (d.extra_data && typeof d.extra_data === 'object') {
        Object.keys(d.extra_data).forEach(k => {
          if (!map.has(k)) {
            const pretty = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            map.set(k, pretty);
          }
        });
      }
    });

    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [activePipeline, stages, deals]);

  // All extra fields configs for forms/modals
  const allPipelineFields: PipelineField[] = useMemo(() => {
    const map = new Map<string, PipelineField>();
    (activePipeline?.extra_fields || []).forEach(f => {
      if (f && f.key) map.set(f.key, f);
    });
    stages.forEach(s => {
      (s.extra_fields || []).forEach(f => {
        if (f && f.key && !map.has(f.key)) map.set(f.key, f);
      });
    });
    return Array.from(map.values());
  }, [activePipeline, stages]);

  // Actions
  const handleStageChange = async (dealId: string, newStageId: string) => {
    const targetStage = stages.find(s => String(s.id) === String(newStageId));
    const isConfirmedTarget = targetStage ? Boolean(targetStage.is_confirmed) : false;

    // Optimistic update
    setDeals(prev =>
      prev.map(d =>
        d.id === dealId
          ? { ...d, stage: newStageId, is_confirmed_booking: isConfirmedTarget }
          : d
      )
    );

    try {
      const updated = await updateDeal(dealId, { stage: newStageId });
      setDeals(prev => prev.map(d => (d.id === dealId ? { ...d, ...updated } : d)));
      toast.success(
        isConfirmedTarget
          ? `Deal marked as Confirmed (${targetStage?.title})`
          : `Deal moved to ${targetStage?.title || 'stage'}`
      );
      // Refresh to ensure aggregate server stats and pagination remain accurate
      fetchDeals(selectedPipelineId, page, pageSize, selectedStageId, debouncedSearch, timeframe);
    } catch {
      toast.error('Failed to change stage');
      if (selectedPipelineId) {
        fetchDeals(selectedPipelineId, page, pageSize, selectedStageId, debouncedSearch, timeframe);
      }
    }
  };

  const handleDeleteDeal = async (deal: Deal) => {
    if (!window.confirm(`Delete deal "${deal.name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(deal.id);
    try {
      await deleteDeal(deal.id);
      toast.success('Deal deleted');
      // If deleting last item on page > 1, step back 1 page
      const newPage = deals.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      fetchDeals(selectedPipelineId, newPage, pageSize, selectedStageId, debouncedSearch, timeframe);
      if (viewingDeal?.id === deal.id) setViewingDeal(null);
      if (editingDeal?.id === deal.id) setEditingDeal(null);
    } catch {
      toast.error('Failed to delete deal');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveDeal = async (formData: DealFormData): Promise<boolean> => {
    if (!selectedPipelineId) {
      toast.error('Please select a pipeline first');
      return false;
    }
    if (!formData.name.trim()) {
      toast.error('Deal name is required');
      return false;
    }

    try {
      if (formData.id) {
        const updated = await updateDeal(formData.id, {
          name: formData.name.trim(),
          value: Number(formData.value) || 0,
          stage: formData.stage,
          wa_contact: formData.wa_contact || null,
          manual_contact: formData.manual_contact || '',
          note: formData.note || '',
          extra_data: formData.extra_data || {},
        });
        setDeals(prev => prev.map(d => (d.id === formData.id ? updated : d)));
        if (viewingDeal?.id === formData.id) setViewingDeal(updated);
        toast.success('Deal updated');
      } else {
        const targetStage = formData.stage || stages[0]?.id;
        await createDeal({
          name: formData.name.trim(),
          value: Number(formData.value) || 0,
          pipeline: selectedPipelineId,
          stage: targetStage,
          wa_contact: formData.wa_contact || null,
          manual_contact: formData.manual_contact || '',
          note: formData.note || '',
          extra_data: formData.extra_data || {},
        });
        toast.success('Deal created');
      }
      // Refresh current page
      fetchDeals(selectedPipelineId, page, pageSize, selectedStageId, debouncedSearch, timeframe);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to save deal';
      toast.error(msg);
      return false;
    }
  };

  const handleOpenNoteModal = (deal: Deal) => {
    setEditingNoteDeal(deal);
    setNoteText(deal.note || '');
  };

  const handleCloseNoteModal = () => {
    if (savingNote) return;
    setEditingNoteDeal(null);
    setNoteText('');
  };

  const handleSaveNoteModal = async () => {
    if (!editingNoteDeal) return;
    setSavingNote(true);
    try {
      await updateDeal(editingNoteDeal.id, { note: noteText });
      setDeals(prev => prev.map(d => (d.id === editingNoteDeal.id ? { ...d, note: noteText } : d)));
      if (viewingDeal?.id === editingNoteDeal.id) {
        setViewingDeal(prev => (prev ? { ...prev, note: noteText } : null));
      }
      toast.success('Note updated');
      setEditingNoteDeal(null);
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  return {
    pipelines,
    activePipeline,
    stages,
    deals,
    totalDealsCount: totalCount,
    contacts,
    loading: loadingPipelines || loadingDeals,
    deletingId,
    stats,
    extraFieldColumns,
    allPipelineFields,

    // Pagination
    page,
    pageSize,
    totalPages,
    totalCount,
    handlePageChange,
    handlePageSizeChange,

    // Filters
    selectedPipelineId,
    setSelectedPipelineId: handlePipelineChange,
    selectedStageId,
    setSelectedStageId: handleStageFilterChange,
    timeframe,
    setTimeframe: handleTimeframeChange,
    search,
    setSearch,

    // Actions
    handleStageChange,
    handleDeleteDeal,
    handleSaveDeal,

    // Modals
    viewingDeal,
    setViewingDeal,
    editingDeal,
    setEditingDeal,
    isAddingDeal,
    setIsAddingDeal,

    // Note Modal
    editingNoteDeal,
    noteText,
    setNoteText,
    savingNote,
    handleOpenNoteModal,
    handleCloseNoteModal,
    handleSaveNoteModal,
  };
}
