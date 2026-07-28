import React from 'react';
import { Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export function SettingsHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#007e3a] dark:text-emerald-400 uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4" /> System Administration
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <SettingsIcon className="h-6 w-6 text-[#007e3a] dark:text-emerald-400" />
            Settings & Configurations
          </h1>
        </div>
      </div>
    </div>
  );
}
