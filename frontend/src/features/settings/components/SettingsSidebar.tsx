import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { SettingsTab, TabMeta } from '../types';

export function SettingsSidebar({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: TabMeta[];
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <div className="lg:col-span-4 xl:col-span-3 space-y-2">
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
        <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Settings Navigation
        </div>

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-[#007e3a]/10 dark:bg-emerald-950/40 text-[#007e3a] dark:text-emerald-400 border border-[#007e3a]/30 dark:border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-colors mt-0.5 ${
                  isActive
                    ? 'bg-[#007e3a] text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                }`}
              >
                {tab.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold truncate">{tab.label}</span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isActive ? 'rotate-90 text-[#007e3a] dark:text-emerald-400' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
                  {tab.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
