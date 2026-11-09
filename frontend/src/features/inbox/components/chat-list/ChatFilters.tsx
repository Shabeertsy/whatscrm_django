import React from 'react';
import { Search, User2, Users, Inbox, ChevronDown, X, Smartphone } from 'lucide-react';
import type { AssignmentFilter } from '../../hooks/useChatFilters';

interface ChatFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  stageFilter: string;
  setStageFilter: (s: string) => void;
  availableStages: string[];
  assignmentFilter: AssignmentFilter;
  setAssignmentFilter: (f: AssignmentFilter) => void;
  instanceFilter: string;
  setInstanceFilter: (id: string) => void;
  instances: Array<{ id: string; display_name: string }>;
}

export function ChatFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  stageFilter,
  setStageFilter,
  availableStages,
  assignmentFilter,
  setAssignmentFilter,
  instanceFilter,
  setInstanceFilter,
  instances,
}: ChatFiltersProps) {
  const hasDropdowns = instances.length > 0 || availableStages.length > 0;

  return (
    <div className="space-y-1.5">

      {/* ── Row 1: Search ── */}
      <div className="relative">
        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search chats…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-7 text-[9px] xl:text-[9.5px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a] focus:bg-white dark:focus:bg-slate-800 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── Row 2: Assignment segmented control ── */}
      <div className="grid grid-cols-3 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
        {([
          { id: 'all'        as AssignmentFilter, label: 'All Chats',   Icon: Inbox  },
          { id: 'mine'       as AssignmentFilter, label: 'Mine',        Icon: User2  },
          { id: 'unassigned' as AssignmentFilter, label: 'Unassigned',  Icon: Users  },
        ] as const).map(({ id, label, Icon }) => {
          const active = assignmentFilter === id;
          return (
            <button
              key={id}
              onClick={() => setAssignmentFilter(id)}
              className={`flex items-center justify-center gap-1 py-[5px] px-1 rounded-md text-[8.5px] xl:text-[9px] transition-all ${
                active
                  ? 'bg-white dark:bg-slate-900 text-[#007e3a] dark:text-emerald-400 font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`h-2.5 w-2.5 shrink-0 ${active ? 'text-[#007e3a] dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Row 3: Status pill chips — full width ── */}
      <div className="flex items-center gap-1">
        {([
          { id: 'all',      label: 'All'      },
          { id: 'open',     label: 'Open'     },
          { id: 'resolved', label: 'Resolved' },
        ] as const).map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-[4px] rounded-full text-[8.5px] xl:text-[9px] font-medium border transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#007e3a] border-[#007e3a] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Row 4: Line & Stage dropdowns — full width, side by side ── */}
      {hasDropdowns && (
        <div className={`grid gap-1.5 ${instances.length > 0 && availableStages.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {instances.length > 0 && (
            <div className="relative">
              <Smartphone className="h-2.5 w-2.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={instanceFilter}
                onChange={(e) => setInstanceFilter(e.target.value)}
                className={`w-full h-[26px] text-[8.5px] xl:text-[9px] font-medium rounded-lg pl-6 pr-5 border cursor-pointer appearance-none outline-none transition-all ${
                  instanceFilter !== 'all'
                    ? 'bg-[#007e3a]/10 border-[#007e3a]/50 text-[#007e3a] dark:text-emerald-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
                title="Filter by WhatsApp Line"
              >
                <option value="all">All Lines</option>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.display_name}</option>
                ))}
              </select>
              <ChevronDown className="h-2.5 w-2.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {availableStages.length > 0 && (
            <div className="relative">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className={`w-full h-[26px] text-[8.5px] xl:text-[9px] font-medium rounded-lg pl-2.5 pr-5 border cursor-pointer appearance-none outline-none transition-all ${
                  stageFilter !== 'all'
                    ? 'bg-[#007e3a]/10 border-[#007e3a]/50 text-[#007e3a] dark:text-emerald-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
                title="Filter by Pipeline Stage"
              >
                <option value="all">All Stages</option>
                {availableStages.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <ChevronDown className="h-2.5 w-2.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
