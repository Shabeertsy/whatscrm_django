import React, { useState } from 'react';
import {
  Search, X, Smartphone, ChevronDown, SlidersHorizontal,
  ChevronUp, RotateCcw, GitBranch, Calendar, Hash,
  ListFilter, AlignLeft, FileText,
} from 'lucide-react';
import type { ExtraFieldColumn, DynamicFieldFilter } from './types';
import { ConfirmedBookingsExtraFilters } from './ConfirmedBookingsExtraFilters';

interface ConfirmedBookingsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedPipeline: string;
  onPipelineChange: (pipeline: string) => void;
  pipelineNames: string[];
  instances?: Array<{ id: string; display_name: string }>;
  selectedInstanceId?: string;
  onInstanceChange?: (instanceId: string) => void;
  /** Dynamic field columns from pipeline config + Notes */
  extraFieldColumns?: ExtraFieldColumn[];
  /** Currently active dynamic field filters */
  dynamicFilters?: DynamicFieldFilter[];
  onDynamicFiltersChange?: (filters: DynamicFieldFilter[]) => void;
}

function getPillIcon(type?: string, key?: string) {
  if (key === 'note' || key === 'notes') return <FileText className="h-3 w-3 text-amber-500" />;
  if (type === 'date') return <Calendar className="h-3 w-3 text-blue-500" />;
  if (type === 'number') return <Hash className="h-3 w-3 text-indigo-500" />;
  if (type === 'select') return <ListFilter className="h-3 w-3 text-emerald-500" />;
  return <AlignLeft className="h-3 w-3 text-slate-400" />;
}

export function ConfirmedBookingsFilters({
  search,
  onSearchChange,
  selectedPipeline,
  onPipelineChange,
  pipelineNames,
  instances = [],
  selectedInstanceId = 'all',
  onInstanceChange,
  extraFieldColumns = [],
  dynamicFilters = [],
  onDynamicFiltersChange,
}: ConfirmedBookingsFiltersProps) {
  const [showExtraFilters, setShowExtraFilters] = useState(false);

  const activeCount = dynamicFilters.filter(f => {
    if (f.type === 'date') return !!(f.dateFrom || f.dateTo);
    if (f.type === 'number') return (f.numMin !== '' && f.numMin !== undefined) || (f.numMax !== '' && f.numMax !== undefined);
    return !!(f.value && f.value.trim() !== '');
  }).length;

  const clearFilter = (key: string) => {
    if (!onDynamicFiltersChange) return;
    onDynamicFiltersChange(dynamicFilters.filter(f => f.key !== key));
  };

  const clearAllDynamic = () => {
    if (!onDynamicFiltersChange) return;
    onDynamicFiltersChange([]);
  };

  const getFilter = (key: string): DynamicFieldFilter | undefined =>
    dynamicFilters.find(f => f.key === key);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* ── Main Filter Bar ── */}
      <div className="flex flex-wrap gap-2.5 items-center p-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[240px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#007e3a] transition-colors" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search deals, contacts, phones, notes…"
            className="w-full pl-9 pr-8 py-2 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pipeline Selector */}
          <div className="relative">
            <GitBranch className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedPipeline}
              onChange={e => onPipelineChange(e.target.value)}
              className="h-[38px] pl-8 pr-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-lg text-[12.5px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer appearance-none min-w-[150px]"
              title="Filter by pipeline"
            >
              {pipelineNames.length === 0 ? (
                <option value="" disabled>No pipelines</option>
              ) : (
                pipelineNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))
              )}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* WhatsApp Line Selector */}
          {instances.length > 0 && onInstanceChange && (
            <div className="relative">
              <Smartphone className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedInstanceId}
                onChange={e => onInstanceChange(e.target.value)}
                className={`h-[38px] text-[12.5px] font-medium rounded-lg pl-8 pr-7 border cursor-pointer appearance-none outline-none transition-all ${
                  selectedInstanceId !== 'all'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#007e3a] text-[#007e3a] dark:text-emerald-400 font-semibold'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
                title="Filter by WhatsApp Line"
              >
                <option value="all">All Lines</option>
                {instances.map(i => (
                  <option key={i.id} value={i.id}>{i.display_name}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Dynamic Extra Filters Toggle Button */}
          {extraFieldColumns.length > 0 && (
            <button
              type="button"
              onClick={() => setShowExtraFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-lg border text-[12.5px] font-semibold transition-all ${
                showExtraFilters || activeCount > 0
                  ? 'bg-[#007e3a] hover:bg-[#006830] border-[#007e3a] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              title="Toggle dynamic field filters (Dates, Numbers, Notes, etc.)"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Field Filters</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-white text-[#007e3a] text-[10px] font-bold">
                  {activeCount}
                </span>
              )}
              {showExtraFilters
                ? <ChevronUp className="h-3.5 w-3.5 ml-0.5 opacity-80" />
                : <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-80" />}
            </button>
          )}

          {/* Reset All Filters button */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAllDynamic}
              className="inline-flex items-center gap-1 h-[38px] px-2.5 rounded-lg border border-dashed border-red-300 dark:border-red-900/80 text-red-600 dark:text-red-400 text-[12px] font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Clear all active field filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Filters Indicator Pills (visible even when panel is collapsed) ── */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
            Active filters ({activeCount}):
          </span>
          {extraFieldColumns.map(col => {
            const f = getFilter(col.key);
            if (!f) return null;
            let displayVal = '';
            if (f.type === 'date' && (f.dateFrom || f.dateTo)) {
              if (f.dateFrom && f.dateTo && f.dateFrom === f.dateTo) {
                displayVal = f.dateFrom;
              } else {
                displayVal = `${f.dateFrom || 'Any'} → ${f.dateTo || 'Any'}`;
              }
            } else if (f.type === 'number' && ((f.numMin !== '' && f.numMin !== undefined) || (f.numMax !== '' && f.numMax !== undefined))) {
              displayVal = `${f.numMin ?? ''} – ${f.numMax ?? ''}`;
            } else if (f.value && f.value.trim()) {
              displayVal = f.value.trim();
            }
            if (!displayVal) return null;

            return (
              <span
                key={col.key}
                className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800"
              >
                <span>{getPillIcon(col.type, col.key)}</span>
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">{col.label}:</span>
                <span className="font-mono text-[10.5px] max-w-[140px] truncate">{displayVal}</span>
                <button
                  type="button"
                  onClick={() => clearFilter(col.key)}
                  className="p-0.5 rounded-full hover:bg-emerald-200/60 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 transition-colors"
                  title={`Remove ${col.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={clearAllDynamic}
            className="text-[11px] text-red-500 dark:text-red-400 hover:underline font-medium ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Extracted Dynamic Field Filters Component ── */}
      {showExtraFilters && extraFieldColumns.length > 0 && onDynamicFiltersChange && (
        <ConfirmedBookingsExtraFilters
          fields={extraFieldColumns}
          filters={dynamicFilters}
          onFiltersChange={onDynamicFiltersChange}
          onClose={() => setShowExtraFilters(false)}
        />
      )}
    </div>
  );
}
