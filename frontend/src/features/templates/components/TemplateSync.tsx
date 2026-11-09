import React, { useState } from 'react';
import { Loader2, RefreshCw, ChevronDown } from 'lucide-react';

interface TemplateSyncProps {
  instances: any[];
  loading: boolean;
  syncingId: string | null;
  isSyncingAll?: boolean;
  onSync: (id: string) => void;
  onSyncAll: () => void;
}

export function TemplateSync({ instances, loading, syncingId, isSyncingAll, onSync, onSyncAll }: TemplateSyncProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeInstances = instances.filter(i => i.is_active);

  if (activeInstances.length === 0 && !loading) {
    return <span className="text-xs font-medium text-slate-500">No active instances</span>;
  }

  // Single instance layout
  if (activeInstances.length === 1) {
    const inst = activeInstances[0];
    const isSyncing = syncingId === inst.id || isSyncingAll;
    return (
      <button
        onClick={() => onSync(inst.id)}
        disabled={isSyncing}
        title={`Sync templates from ${inst.display_name} with Meta`}
        className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-[#007e3a] ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Syncing...' : 'Sync Templates'}</span>
      </button>
    );
  }

  // Multiple instances: Unified Sync All button + dropdown for specific line
  return (
    <div className="relative inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
      <button
        onClick={onSyncAll}
        disabled={isSyncingAll || syncingId !== null}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-l-lg transition-colors border-r border-slate-200 dark:border-slate-700 disabled:opacity-60"
        title="Sync templates from all active WhatsApp lines with Meta"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-[#007e3a] ${isSyncingAll ? 'animate-spin' : ''}`} />
        <span>{isSyncingAll ? 'Syncing All Lines…' : 'Sync All Lines'}</span>
      </button>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={isSyncingAll || syncingId !== null}
        className="px-2 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-r-lg transition-colors"
        title="Choose a specific line to sync"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => { setDropdownOpen(false); onSyncAll(); }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
          >
            <span>Sync All Lines ({activeInstances.length})</span>
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Sync Specific Line
          </div>
          {activeInstances.map(inst => (
            <button
              key={inst.id}
              onClick={() => { setDropdownOpen(false); onSync(inst.id); }}
              className="w-full text-left px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <span className="truncate">{inst.display_name}</span>
              {syncingId === inst.id && <Loader2 className="h-3 w-3 animate-spin text-[#007e3a]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
