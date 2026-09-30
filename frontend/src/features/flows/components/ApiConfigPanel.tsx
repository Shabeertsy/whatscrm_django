import React, { useState } from "react";
import { Loader2, List, AlertCircle } from "lucide-react";
import { flowsApi } from "../../../api/flows";
import { FlowField, ApiConfig } from "../types";
import { defaultApiConfig } from "../utils";



export function ApiConfigPanel({ field, onUpdate }: { field: FlowField; onUpdate: (f: FlowField) => void }) {
  const cfg = field.apiConfig ?? defaultApiConfig();
  const upd = (patch: Partial<ApiConfig>) =>
    onUpdate({ ...field, apiConfig: { ...cfg, ...patch } });

  const [preview, setPreview] = useState<{ loading: boolean; options: any[]; error: string | null; count: number | null }>({
    loading: false, options: [], error: null, count: null,
  });


  const runPreview = async () => {
    if (!cfg.url.trim()) return;
    setPreview({ loading: true, options: [], error: null, count: null });
    try {
      const res = await flowsApi.previewApi({ ...cfg });
      setPreview({ loading: false, options: res.data.options ?? [], error: null, count: res.data.count });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Request failed";
      setPreview({ loading: false, options: [], error: msg, count: null });
    }
  };


  return (
    <div className="space-y-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">API Configuration</p>

      <div>
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">URL <span className="text-rose-400">*</span></label>
        <input
          className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 font-mono"
          placeholder="https://api.example.com/items/"
          value={cfg.url}
          onChange={e => upd({ url: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">ID Field</label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 font-mono"
            placeholder="id"
            value={cfg.id_field}
            onChange={e => upd({ id_field: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Label Field</label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 font-mono"
            placeholder="name"
            value={cfg.label_field}
            onChange={e => upd({ label_field: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Results Key <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 font-mono"
            placeholder="results"
            value={cfg.results_key}
            onChange={e => upd({ results_key: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Filter Field <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 font-mono"
            placeholder="field_id"
            value={cfg.filter_param}
            onChange={e => upd({ filter_param: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Authorization <span className="text-slate-400 font-normal">(optional)</span></label>
        <input
          className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 font-mono"
          placeholder="Bearer your-token"
          value={cfg.headers?.["Authorization"] ?? ""}
          onChange={e => upd({ headers: e.target.value ? { "Authorization": e.target.value } : {} })}
        />
      </div>

      {/* Preview button */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          disabled={!cfg.url.trim() || preview.loading}
          onClick={runPreview}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#007e3a] hover:text-[#007e3a] dark:hover:text-[#00c857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-900"
        >
          {preview.loading
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Fetching…</>
            : <><List className="w-3 h-3" /> Preview items</>
          }
        </button>
        {preview.count !== null && !preview.loading && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {preview.count} item{preview.count !== 1 ? "s" : ""} found
          </span>
        )}
      </div>


      {/* Preview error */}
      {preview.error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded p-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{preview.error}</span>
        </div>
      )}


      {/* Preview results list */}
      {preview.options.length > 0 && (
        <div className="rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
            {preview.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-mono flex-shrink-0 w-16 truncate">{opt.id}</span>
                <span className="text-slate-700 dark:text-slate-200 truncate">{opt.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
