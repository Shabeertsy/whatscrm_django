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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      
      <div>
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Synchronize with Meta Cloud
        </h3>
        <p className="text-xs text-slate-500 max-w-lg">
          Fetch the latest template approvals, rejections, and new creations directly from your WhatsApp Business Account.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-3 shrink-0">
        {instances.map((inst) => (
          <button
            key={inst.id}
            onClick={() => onSync(inst.id)}
            disabled={syncingId === inst.id || !inst.is_active}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              inst.is_active 
                ? 'bg-[#007e3a] hover:bg-[#00602d] text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {syncingId === inst.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync {inst.display_name}
          </button>
        ))}
        {instances.length === 0 && !loading && (
          <span className="text-sm font-medium text-slate-500">No instances active</span>
        )}
      </div>
    </div>
  );
}
