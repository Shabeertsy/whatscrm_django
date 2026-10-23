import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Search, Calendar, TrendingUp, Loader2, Building2, X, Trash2 } from 'lucide-react';
import { getConfirmedBookings, deleteConfirmedBooking, ConfirmedBooking, getPipelines, Pipeline } from './api';
import toast from 'react-hot-toast';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConfirmedBookings() {
  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');

  useEffect(() => {
    Promise.all([getConfirmedBookings(), getPipelines()])
      .then(([bData, pData]) => {
        setBookings(bData);
        setPipelines(pData);
      })
      .catch(() => toast.error('Failed to load confirmed bookings'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchPipeline =
        selectedPipeline === 'all' || b.confirmed_pipeline_name === selectedPipeline;
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

  // Unique pipeline names from snapshot (survives deletions)
  const pipelineNames = useMemo(() => {
    const names = new Set(bookings.map(b => b.confirmed_pipeline_name).filter(Boolean));
    return Array.from(names).sort();
  }, [bookings]);

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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-[#007e3a]" />
            Confirmed Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All deals confirmed across every pipeline — preserved even if stages are deleted
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
          <option value="all">All Pipelines</option>
          {pipelineNames.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Deal</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Pipeline</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Value</th>
                <th className="px-5 py-3.5">Confirmed At</th>
                <th className="px-5 py-3.5">Extra Info</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#007e3a] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
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
                  const hasExtraData =
                    booking.extra_data && Object.keys(booking.extra_data).length > 0;
                  const stageDeleted = !booking.stage;
                  return (
                    <tr
                      key={booking.id}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Deal */}
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                            {booking.name}
                          </p>
                          {booking.note && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5 italic">
                              {booking.note}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {booking.contact_name || booking.manual_contact || '—'}
                        </p>
                        {booking.contact_phone && (
                          <p className="text-[11px] text-slate-400">{booking.contact_phone}</p>
                        )}
                      </td>
                      {/* Pipeline */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {booking.confirmed_pipeline_name || '—'}
                          </span>
                          {!booking.pipeline && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                              (deleted)
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Stage */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                            ✓ {booking.confirmed_stage_title || '—'}
                          </span>
                          {stageDeleted && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                              (deleted)
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Value */}
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 dark:text-white text-[15px]">
                          ₹{Number(booking.value || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      {/* Confirmed At */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{formatDate(booking.confirmed_at)}</span>
                        </div>
                      </td>
                      {/* Extra Info */}
                      <td className="px-5 py-3.5">
                        {hasExtraData ? (
                          <div className="space-y-1">
                            {Object.entries(booking.extra_data!).map(([k, v]) =>
                              v ? (
                                <div key={k} className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium capitalize">
                                    {k.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                                    {String(v)}
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
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
              {selectedPipeline !== 'all' && ` · Pipeline: ${selectedPipeline}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfirmedBookings;
