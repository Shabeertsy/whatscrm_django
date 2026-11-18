import React from 'react';
import {
  Calendar, Hash, AlignLeft, ListFilter, FileText, X,
  RotateCcw, Clock, Check
} from 'lucide-react';
import type { ExtraFieldColumn, DynamicFieldFilter } from './types';

interface ConfirmedBookingsExtraFiltersProps {
  fields: ExtraFieldColumn[];
  filters: DynamicFieldFilter[];
  onFiltersChange: (filters: DynamicFieldFilter[]) => void;
  onClose?: () => void;
}

function getFieldIcon(type?: string, key?: string) {
  if (key === 'note' || key === 'notes') return <FileText className="h-3.5 w-3.5 text-amber-500" />;
  if (type === 'date') return <Calendar className="h-3.5 w-3.5 text-blue-500" />;
  if (type === 'number') return <Hash className="h-3.5 w-3.5 text-indigo-500" />;
  if (type === 'select') return <ListFilter className="h-3.5 w-3.5 text-emerald-500" />;
  return <AlignLeft className="h-3.5 w-3.5 text-slate-400" />;
}

function getFieldTypeBadge(type?: string, key?: string) {
  if (key === 'note' || key === 'notes') {
    return (
      <span className="text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
        Note
      </span>
    );
  }
  if (type === 'date') {
    return (
      <span className="text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60">
        Date Range
      </span>
    );
  }
  if (type === 'number') {
    return (
      <span className="text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60">
        Number
      </span>
    );
  }
  if (type === 'select') {
    return (
      <span className="text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
        Select
      </span>
    );
  }
  return (
    <span className="text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
      Text
    </span>
  );
}

export function ConfirmedBookingsExtraFilters({
  fields,
  filters,
  onFiltersChange,
  onClose,
}: ConfirmedBookingsExtraFiltersProps) {
  const getFilter = (key: string): DynamicFieldFilter | undefined =>
    filters.find(f => f.key === key);

  const updateFilter = (key: string, patch: Partial<DynamicFieldFilter>) => {
    const col = fields.find(c => c.key === key);
    const type = (col?.type || 'text') as DynamicFieldFilter['type'];
    const existing = filters.find(f => f.key === key);
    if (existing) {
      onFiltersChange(
        filters.map(f => f.key === key ? { ...f, ...patch } : f)
      );
    } else {
      onFiltersChange([...filters, { key, type, ...patch }]);
    }
  };

  const clearFilter = (key: string) => {
    onFiltersChange(filters.filter(f => f.key !== key));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const activeCount = filters.filter(f => {
    if (f.type === 'date') return !!(f.dateFrom || f.dateTo);
    if (f.type === 'number') return (f.numMin !== '' && f.numMin !== undefined) || (f.numMax !== '' && f.numMax !== undefined);
    return !!(f.value && f.value.trim() !== '');
  }).length;

  // Date preset helper
  const applyDatePreset = (key: string, preset: 'today' | 'yesterday' | 'this_week' | 'this_month') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = formatYMD(now);
      updateFilter(key, { dateFrom: todayStr, dateTo: todayStr });
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatYMD(yest);
      updateFilter(key, { dateFrom: yestStr, dateTo: yestStr });
    } else if (preset === 'this_week') {
      const day = now.getDay() || 7; // Sunday = 7
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      updateFilter(key, { dateFrom: formatYMD(monday), dateTo: formatYMD(now) });
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      updateFilter(key, { dateFrom: formatYMD(firstDay), dateTo: formatYMD(now) });
    }
  };

  return (
    <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 transition-all">
      {/* Header bar of extra filters panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Dynamic Field Filters
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All ({activeCount})
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Close filter panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of dynamic fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {fields.map(col => {
          const f = getFilter(col.key);
          const type = (col.type || 'text') as DynamicFieldFilter['type'];
          const isNote = col.key === 'note' || col.key === 'notes';
          const isActive =
            type === 'date'
              ? !!(f?.dateFrom || f?.dateTo)
              : type === 'number'
                ? (f?.numMin !== '' && f?.numMin !== undefined) || (f?.numMax !== '' && f?.numMax !== undefined)
                : !!(f?.value && f.value.trim());

          return (
            <div
              key={col.key}
              className={`flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900/90 p-3 shadow-xs transition-all duration-150 ${isActive
                ? 'border-[#007e3a] ring-2 ring-[#007e3a]/15 shadow-sm'
                : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              {/* Card top: icon, label, badge, clear */}
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0">{getFieldIcon(type, col.key)}</span>
                    <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={col.label}>
                      {col.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {getFieldTypeBadge(type, col.key)}
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => clearFilter(col.key)}
                        className="h-4 w-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-0.5"
                        title={`Clear ${col.label} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Input according to field type */}
                {type === 'date' && (
                  <div className="space-y-2 mt-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-medium text-slate-400 mb-0.5">From Date</label>
                        <input
                          type="date"
                          value={f?.dateFrom || ''}
                          onChange={e => updateFilter(col.key, { dateFrom: e.target.value })}
                          className="w-full px-2 py-1 text-[11.5px] border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-medium text-slate-400 mb-0.5">To Date</label>
                        <input
                          type="date"
                          value={f?.dateTo || ''}
                          min={f?.dateFrom || undefined}
                          onChange={e => updateFilter(col.key, { dateTo: e.target.value })}
                          className="w-full px-2 py-1 text-[11.5px] border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Date quick presets pills */}
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 mr-0.5 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                      </span>
                      <button
                        type="button"
                        onClick={() => applyDatePreset(col.key, 'today')}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset(col.key, 'this_week')}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        This Week
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset(col.key, 'this_month')}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        This Month
                      </button>
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => clearFilter(col.key)}
                          className="text-[10px] font-medium text-red-500 hover:underline ml-auto"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {type === 'number' && (
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 min-w-0 relative">
                        <input
                          type="number"
                          placeholder="Min"
                          value={f?.numMin ?? ''}
                          onChange={e => updateFilter(col.key, { numMin: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                      </div>
                      <span className="text-slate-400 text-xs font-semibold">–</span>
                      <div className="flex-1 min-w-0 relative">
                        <input
                          type="number"
                          placeholder="Max"
                          value={f?.numMax ?? ''}
                          onChange={e => updateFilter(col.key, { numMax: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {type === 'select' && col.options && col.options.length > 0 && (
                  <div className="mt-1">
                    <select
                      value={f?.value || ''}
                      onChange={e => updateFilter(col.key, { value: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors cursor-pointer"
                    >
                      <option value="">Any {col.label}</option>
                      {col.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(type === 'text' || isNote || (type === 'select' && (!col.options || col.options.length === 0))) && (
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      placeholder={isNote ? "Filter by note text…" : `Search ${col.label.toLowerCase()}…`}
                      value={f?.value || ''}
                      onChange={e => updateFilter(col.key, { value: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                    {f?.value && (
                      <button
                        type="button"
                        onClick={() => updateFilter(col.key, { value: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Clear field input"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status footer for active card */}
              {isActive && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Filter active
                  </span>
                  <button
                    type="button"
                    onClick={() => clearFilter(col.key)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

