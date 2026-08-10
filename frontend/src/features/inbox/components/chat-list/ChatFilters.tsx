import React from 'react';
import { Search } from 'lucide-react';

interface ChatFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  stageFilter: string;
  setStageFilter: (s: string) => void;
  availableStages: string[];
}

export function ChatFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  stageFilter,
  setStageFilter,
  availableStages
}: ChatFiltersProps) {
  return (
    <>
      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-800 transition-colors"
        />
      </div>

      {/* Filter Pills and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "open", label: "Open" },
            { id: "resolved", label: "Resolved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex-shrink-0 ${statusFilter === tab.id
                ? "bg-[#007e3a] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {availableStages.length > 0 && (
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
            }}
            className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md px-1.5 py-1 border-none focus:ring-0 cursor-pointer outline-none ml-2 shrink-0 shadow-sm max-w-[120px] truncate"
          >
            <option value="all">Stage: All</option>
            {availableStages.map(stage => (
               <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}
