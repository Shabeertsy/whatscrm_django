import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface TemplateSyncProps {
  instances: any[];
  loading: boolean;
  syncingId: string | null;
  onSync: (id: string) => void;
}

export function TemplateSync({ instances, loading, syncingId, onSync }: TemplateSyncProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {instances.map((inst) => (
        <button
          key={inst.id}
          onClick={() => onSync(inst.id)}
          disabled={syncingId === inst.id || !inst.is_active}
          title={`Sync ${inst.display_name} with Meta`}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition border shadow-sm ${
            inst.is_active 
              ? 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {syncingId === inst.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007e3a]" /> : <RefreshCw className="h-3.5 w-3.5 text-[#007e3a]" />}
          Sync {inst.display_name}
        </button>
      ))}
      {instances.length === 0 && !loading && (
        <span className="text-xs font-medium text-slate-500">No active instances</span>
      )}
    </div>
  );
}
