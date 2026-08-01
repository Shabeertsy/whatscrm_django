import React from 'react';
import { Loader2 } from 'lucide-react';
import { PipelineStage } from '../../../pipeline/api';



interface StageListSectionProps {
  loading: boolean;
  stages: PipelineStage[];
  onSelectStage: (stage: PipelineStage) => void;
}


export function StageListSection({ loading, stages, onSelectStage }: StageListSectionProps) {
  return (
    <div className="p-2 bg-slate-50/50 dark:bg-slate-800/50">
      <label className="block px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Select Stage to Save
      </label>
      <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : stages.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-400 text-center">No stages found</div>
        ) : (
          stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-white dark:hover:bg-slate-700/50 rounded-lg transition text-left group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm"
            >
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: stage.color || '#ccc' }} />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{stage.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
