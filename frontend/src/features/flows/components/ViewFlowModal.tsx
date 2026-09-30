import React, { useState } from "react";
import { X, BarChart2, Code2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { FlowVisualizer } from "./FlowVisualizer";


interface ViewFlowModalProps {
  viewFlow: any;
  onClose: () => void;
}


export function ViewFlowModal({ viewFlow, onClose }: ViewFlowModalProps) {
  const [showViewJson, setShowViewJson] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  if (!viewFlow) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {viewFlow.name}
              {viewFlow.status === "PUBLISHED" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium uppercase tracking-wide">Published</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium uppercase tracking-wide">Draft</span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{viewFlow.category?.replace(/_/g, " ")}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Submissions</p>
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#007e3a]" /> {viewFlow.submission_count}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Created</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {new Date(viewFlow.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Visual Structure</h3>
            <FlowVisualizer flowJson={viewFlow.flow_json} />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">
            <button
              type="button"
              onClick={() => setShowViewJson(p => !p)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <Code2 className="w-3.5 h-3.5 text-slate-400" /> Raw JSON Structure
              </span>
              {showViewJson ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {showViewJson && (
              <div className="relative bg-[#0d1117]">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(viewFlow.flow_json, null, 2));
                    setJsonCopied(true);
                    setTimeout(() => setJsonCopied(false), 2000);
                  }}
                  className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors"
                >
                  {jsonCopied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <pre className="overflow-x-auto text-xs leading-relaxed p-4 pt-10 text-[#e6edf3] font-mono max-h-80">
                  <code>{JSON.stringify(viewFlow.flow_json, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
