import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Search, TrendingUp, Loader2, Building2, X, Trash2, Check, Pencil, Phone, FileText } from 'lucide-react';
import { getConfirmedBookings, deleteConfirmedBooking, updateConfirmedBooking, ConfirmedBooking, getPipelines, Pipeline } from './api';
import toast from 'react-hot-toast';



export function ConfirmedBookings() {
  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<ConfirmedBooking | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    Promise.all([getConfirmedBookings(), getPipelines()])
      .then(([bData, pData]) => {
        setBookings(bData);
        setPipelines(pData);
        const active = pData.find(p => p.is_active);
        if (active) {
          setSelectedPipeline(active.name);
        } else if (pData.length > 0) {
          setSelectedPipeline(pData[0].name);
        } else if (bData.length > 0) {
          setSelectedPipeline(bData[0].confirmed_pipeline_name);
        }
      })
      .catch(() => toast.error('Failed to load confirmed bookings'))
      .finally(() => setLoading(false));
  }, []);

  // Unique pipeline names from both pipelines list and confirmed bookings
  const pipelineNames = useMemo(() => {
    const names = new Set([
      ...pipelines.map(p => p.name),
      ...bookings.map(b => b.confirmed_pipeline_name)
    ].filter(Boolean));
    return Array.from(names).sort();
  }, [bookings, pipelines]);

  // Ensure selectedPipeline stays pointed to a valid pipeline
  useEffect(() => {
    if (pipelineNames.length > 0 && (!selectedPipeline || !pipelineNames.includes(selectedPipeline))) {
      const active = pipelines.find(p => p.is_active && pipelineNames.includes(p.name));
      setSelectedPipeline(active ? active.name : pipelineNames[0]);
    }
  }, [pipelineNames, pipelines, selectedPipeline]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchPipeline = selectedPipeline ? b.confirmed_pipeline_name === selectedPipeline : true;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.contact_name || '').toLowerCase().includes(q) ||
        (b.contact_phone || '').toLowerCase().includes(q) ||
        b.confirmed_stage_title.toLowerCase().includes(q) ||
        b.confirmed_pipeline_name.toLowerCase().includes(q);
      return matchPipeline && matchSearch;
    });
  }, [bookings, search, selectedPipeline]);

  const totalValue = filtered.reduce((sum, b) => sum + Number(b.value || 0), 0);


  // Dynamic extra field columns derived from pipelines and booking extra_data
  const extraFieldColumns = useMemo(() => {
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

    filtered.forEach(b => {
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
  }, [filtered, pipelines, selectedPipeline]);

  const totalColumns = 5 + extraFieldColumns.length;

  const handleDelete = async (booking: ConfirmedBooking) => {
    if (!window.confirm(`Delete confirmed booking "${booking.name}"? This only removes the booking record — the deal itself is not affected.`)) return;
    setDeleting(booking.id);
    try {
      await deleteConfirmedBooking(booking.id);
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      toast.success('Booking record deleted');
    } catch {
      toast.error('Failed to delete booking');
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenNoteModal = (booking: ConfirmedBooking) => {
    setEditingBooking(booking);
    setNoteText(booking.note || '');
  };

  const handleCloseNoteModal = () => {
    if (savingNote) return;
    setEditingBooking(null);
    setNoteText('');
  };

  const handleSaveNoteModal = async () => {
    if (!editingBooking) return;
    setSavingNote(true);
    try {
      await updateConfirmedBooking(editingBooking.id, { note: noteText });
      setBookings(prev =>
        prev.map(b => (b.id === editingBooking.id ? { ...b, note: noteText } : b))
      );
      toast.success('Note updated');
      setEditingBooking(null);
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Confirmed Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All deals confirmed across every pipeline
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filtered.length}</p>
              <p className="text-xs text-slate-500 font-medium">Confirmed Bookings</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ₹{totalValue.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 font-medium">Total Value</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {pipelineNames.length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Pipelines</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by deal name, contact, stage..."
            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-[#007e3a] focus:ring-2 focus:ring-[#007e3a]/10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={selectedPipeline}
          onChange={e => setSelectedPipeline(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] min-w-[180px]"
        >
          {pipelineNames.length === 0 ? (
            <option value="" disabled>No pipelines</option>
          ) : (
            pipelineNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Deal / Contact</th>
                <th className="px-5 py-3.5">Pipeline</th>
                <th className="px-5 py-3.5">Value</th>
                {extraFieldColumns.map(col => (
                  <th key={col.key} className="px-5 py-3.5 whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={totalColumns} className="px-5 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#007e3a] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={totalColumns} className="px-5 py-16 text-center">
                    <CheckCircle className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">
                      {bookings.length === 0
                        ? 'No confirmed bookings yet'
                        : 'No bookings match your filters'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {bookings.length === 0
                        ? 'Mark a pipeline stage as "Confirmed" and move deals into it'
                        : 'Try adjusting your search or pipeline filter'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(booking => {
                  const stageDeleted = !booking.stage;
                  return (
                    <tr
                      key={booking.id}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Deal / Contact (Line by line, simple and user-friendly) */}
                      <td className="px-5 py-3.5">
                        {(() => {
                          const contactName = booking.contact_name || booking.manual_contact || '';
                          const phone = booking.contact_phone || '';
                          const isDifferentContact = contactName && contactName.toLowerCase().trim() !== booking.name.toLowerCase().trim();

                          return (
                            <div className="flex flex-col gap-0.5 min-w-[150px]">
                              {/* Primary Name */}
                              <span className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">
                                {booking.name}
                              </span>

                              {/* Secondary Contact Name if different from deal name */}
                              {isDifferentContact && (
                                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-snug">
                                  {contactName}
                                </span>
                              )}

                              {/* Phone Number line by line */}
                              {phone && (
                                <a
                                  href={`tel:${phone}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#007e3a] dark:hover:text-[#00b355] transition-colors w-fit mt-0.5"
                                  title="Call contact"
                                >
                                  <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                  <span className="font-mono tracking-tight">{phone}</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Pipeline & Stage (Stage below pipeline) */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {booking.confirmed_pipeline_name || '—'}
                            </span>
                            {!booking.pipeline && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                (deleted)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 w-fit">
                              ✓ {booking.confirmed_stage_title || '—'}
                            </span>
                            {stageDeleted && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                (deleted)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 dark:text-white text-[15px]">
                          ₹{Number(booking.value || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Dynamic Extra Fields Columns */}
                      {extraFieldColumns.map(col => {
                        const val = booking.extra_data?.[col.key];
                        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
                        return (
                          <td key={col.key} className="px-5 py-3.5 whitespace-nowrap">
                            {hasVal ? (
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {String(val)}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Notes (Click to open popup editor) */}
                      <td className="px-5 py-3.5 min-w-[200px]">
                        <div
                          onClick={() => handleOpenNoteModal(booking)}
                          className="group/note flex items-center justify-between gap-2 cursor-pointer rounded-lg px-2.5 py-1.5 -mx-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                          title="Click to view and edit note"
                        >
                          {booking.note ? (
                            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-[240px] line-clamp-2 leading-relaxed" title={booking.note}>
                              {booking.note}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                              + Add note
                            </span>
                          )}
                          <Pencil className="h-3.5 w-3.5 text-slate-400 group-hover/note:text-[#007e3a] opacity-0 group-hover/note:opacity-100 transition-all flex-shrink-0" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(booking)}
                          disabled={deleting === booking.id}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                          title="Delete booking record"
                        >
                          {deleting === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500">
              Showing{' '}
              <b className="text-slate-800 dark:text-slate-200">{filtered.length}</b> of{' '}
              <b className="text-slate-800 dark:text-slate-200">{bookings.length}</b> confirmed
              bookings
              {selectedPipeline && ` · Pipeline: ${selectedPipeline}`}
            </span>
          </div>
        )}
      </div>

      {/* Edit Note Popup Modal */}
      {editingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleCloseNoteModal}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#007e3a] dark:text-[#00b355] flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Booking Note
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                    {editingBooking.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseNoteModal}
                disabled={savingNote}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Note Details
              </label>
              <textarea
                autoFocus
                rows={5}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSaveNoteModal();
                  } else if (e.key === 'Escape') {
                    handleCloseNoteModal();
                  }
                }}
                placeholder="Write any notes ..."
                disabled={savingNote}
                className="w-full text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#007e3a]/10 transition-all resize-y"
              />

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseNoteModal}
                disabled={savingNote}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNoteModal}
                disabled={savingNote}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#007e3a] hover:bg-[#006830] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
              >
                {savingNote ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Note</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfirmedBookings;
