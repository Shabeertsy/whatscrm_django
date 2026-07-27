import React from "react";
import { Search, X } from "lucide-react";
import { MEDIA_TABS, type MediaTab } from "../utils";

interface Props {
  activeTab: MediaTab;
  onTabChange: (tab: MediaTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  getCount: (type: string) => number;
}

/**
 * Filter tab bar + search input toolbar.
 */
export function MediaToolbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  getCount,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800/80">
      {/* Type Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
        {MEDIA_TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const count = getCount(id);
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#007e3a] text-white shadow-md shadow-[#007e3a]/20 scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`}
              />
              <span>{label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative min-w-[240px] sm:w-72">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files by name..."
          className="w-full bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all font-semibold shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
