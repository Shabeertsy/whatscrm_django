import React from "react";
import { ChevronDown, Zap, Plus, Settings, Check } from "lucide-react";
import { Pipeline } from "../api";


interface SwitcherProps {
  pipelines: Pipeline[];
  activePipeline: Pipeline | null;
  onSwitch: (p: Pipeline) => void;
  onCreateNew: () => void;
  onManage: () => void;
}


export function PipelineSwitcher({ pipelines, activePipeline, onSwitch, onCreateNew, onManage }: SwitcherProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007e3a] transition-colors shadow-sm"
      >
        <span className="max-w-[160px] truncate">{activePipeline?.name || 'Select Pipeline'}</span>
        {activePipeline?.is_active && <span className="h-2 w-2 rounded-full bg-[#007e3a]" title="Active" />}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-72 overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1 tracking-wider">Your Pipelines</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {pipelines.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => { onSwitch(p); setOpen(false); }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${p.is_active ? 'bg-[#007e3a]' : 'bg-slate-200 dark:bg-slate-600'}`} />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                  {p.auto_create_deals && (
                    <span title="Auto-creates deals" className="flex items-center justify-center">
                      <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{p.deal_count} deals</span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => { onCreateNew(); setOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-[#007e3a] hover:bg-[#007e3a]/5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Pipeline
            </button>
            <button
              onClick={() => { onManage(); setOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Settings className="h-3.5 w-3.5" /> Manage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface InfoBarProps {
  activePipeline: Pipeline;
  onToggleAutoCreate: () => void;
  onActivate: (id: string) => void;
}

export function PipelineInfoBar({ activePipeline, onToggleAutoCreate, onActivate }: InfoBarProps) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${activePipeline.is_active ? 'bg-[#007e3a]' : 'bg-slate-300'}`} />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{activePipeline.name}</span>
          {activePipeline.is_active && (
            <span className="px-2 py-0.5 bg-[#007e3a]/10 text-[#007e3a] text-[10px] font-bold rounded-full">ACTIVE</span>
          )}
        </div>
        {activePipeline.auto_create_deals && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Auto-creates deals from new messages</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Auto-create deals</span>
          <button
            onClick={onToggleAutoCreate}
            title={!activePipeline.is_active ? "Activate this pipeline first" : ""}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              activePipeline.auto_create_deals ? 'bg-[#007e3a]' : 'bg-slate-200 dark:bg-slate-700'
            } ${!activePipeline.is_active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${activePipeline.auto_create_deals ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {!activePipeline.is_active && (
          <button
            onClick={() => onActivate(activePipeline.id)}
            className="px-3 py-1.5 bg-[#007e3a] text-white text-xs font-bold rounded-lg hover:bg-[#00662f] transition-colors flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" /> Set as Active
          </button>
        )}
      </div>
    </div>
  );
}
