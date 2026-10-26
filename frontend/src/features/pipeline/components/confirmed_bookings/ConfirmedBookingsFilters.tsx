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
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by deal name, contact, stage..."
          className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-[#007e3a] focus:ring-2 focus:ring-[#007e3a]/10"
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

      <select
        value={selectedPipeline}
        onChange={e => onPipelineChange(e.target.value)}
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
  );
}
