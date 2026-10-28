import React from 'react';
import { Search, X } from 'lucide-react';

interface ConfirmedBookingsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedPipeline: string;
  onPipelineChange: (pipeline: string) => void;
  pipelineNames: string[];
}

export function ConfirmedBookingsFilters({
  search,
  onSearchChange,
  selectedPipeline,
  onPipelineChange,
  pipelineNames,
}: ConfirmedBookingsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800">
      <div className="flex-1 min-w-[240px] relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#007e3a] transition-colors" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by deal name, contact, stage..."
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

      <div className="flex flex-wrap gap-3">
        <select
          value={selectedPipeline}
          onChange={e => onPipelineChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer min-w-[180px]"
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
    </div>
  );
}
