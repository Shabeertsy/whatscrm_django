import React from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Pipeline, PipelineStage } from '../../pipeline/api';
import { TimeframeOption } from '../types';

interface PipelineTableFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  pipelines: Pipeline[];
  selectedPipelineId: string;
  onPipelineChange: (pipelineId: string) => void;
  stages: PipelineStage[];
  selectedStageId: string;
  onStageChange: (stageId: string) => void;
  timeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onAddDeal: () => void;
}

export function PipelineTableFilters({
  search,
  onSearchChange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  stages,
  selectedStageId,
  onStageChange,
  timeframe,
  onTimeframeChange,
  onAddDeal,
}: PipelineTableFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800">
      {/* Left: Search Bar */}
      <div className="flex-1 min-w-[240px] relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#007e3a] transition-colors" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search deals, contacts, phone, notes..."
          className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Right: Selectors & Add Button */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Pipeline Selector */}
        <select
          value={selectedPipelineId}
          onChange={e => onPipelineChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer min-w-[150px]"
        >
          {pipelines.length === 0 ? (
            <option value="" disabled>No pipelines</option>
          ) : (
            pipelines.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_active ? '• Active' : ''}
              </option>
            ))
          )}
        </select>

        {/* Stage Filter */}
        <select
          value={selectedStageId}
          onChange={e => onStageChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer min-w-[130px]"
        >
          <option value="all">All Stages</option>
          {stages.map(s => (
            <option key={s.id} value={s.id}>
              {s.title} {s.is_confirmed ? '(Confirmed)' : ''}
            </option>
          ))}
        </select>

        {/* Timeframe */}
        <select
          value={timeframe}
          onChange={e => onTimeframeChange(e.target.value as TimeframeOption)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="daily">Today</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
        </select>

        {/* Add Deal Action */}
        <button
          type="button"
          onClick={onAddDeal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-[#007e3a] hover:bg-[#006830] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Deal</span>
        </button>
      </div>
    </div>
  );
}
