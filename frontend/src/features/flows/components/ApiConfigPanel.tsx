import React, { useState } from "react";
import { Loader2, List, AlertCircle, Code, RefreshCw } from "lucide-react";
import { flowsApi } from "../../../api/flows";
import { FlowField, ApiConfig } from "../types";
import { defaultApiConfig } from "../utils";



export function ApiConfigPanel({ field, onUpdate }: { field: FlowField; onUpdate: (f: FlowField) => void }) {
  const cfg = field.apiConfig ?? defaultApiConfig();
  const upd = (patch: Partial<ApiConfig>) =>
    onUpdate({ ...field, apiConfig: { ...cfg, ...patch } });

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [raw, setRaw] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "json" | null>(null);

  const runFetch = async (targetView: "list" | "json") => {
    if (!cfg.url.trim()) return;
    setLoading(true);
    setError(null);
    setView(targetView);
    try {
      const res = await flowsApi.previewApi({ ...cfg });
      setOptions(res.data.options ?? []);
      setCount(res.data.count);
      setRaw(res.data.raw ?? null);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Request failed";
      setError(msg);
      setRaw(err.response?.data?.raw ?? null);
      setOptions([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewItems = () => {
    if (loading) return;
    // If we already have data, just toggle view; otherwise fetch
    if (raw || options.length > 0) {
      setView("list");
    } else {
      runFetch("list");
    }
  };

  const handleShowJson = () => {
    if (loading) return;
    if (raw || error) {
      setView(view === "json" ? "list" : "json");
    } else {
      runFetch("json");
    }
  };

  const hasData = raw !== null || options.length > 0 || error !== null;
  const urlEmpty = !cfg.url.trim();

  return (
    <div className="space-y-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">API Configuration</p>

      <div>
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">URL <span className="text-rose-400">*</span></label>
        <input
          className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] font-mono"
          placeholder="https://api.example.com/items/"
          value={cfg.url}
          onChange={e => upd({ url: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">ID Field</label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] font-mono"
            placeholder="id"
            value={cfg.id_field}
            onChange={e => upd({ id_field: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Label Field</label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] font-mono"
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
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] font-mono"
            placeholder="results"
            value={cfg.results_key}
            onChange={e => upd({ results_key: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Filter Field <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] font-mono"
            placeholder="field_id"
            value={cfg.filter_param}
            onChange={e => upd({ filter_param: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Authorization <span className="text-slate-400 font-normal">(optional)</span></label>
        <input
          className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] font-mono"
          placeholder="Bearer your-token"
          value={cfg.headers?.["Authorization"] ?? ""}
          onChange={e => upd({ headers: e.target.value ? { "Authorization": e.target.value } : {} })}
        />
      </div>

      {/* Action buttons row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">

          {/* Preview Items button */}
          <button
            type="button"
            disabled={urlEmpty || loading}
            onClick={handlePreviewItems}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#007e3a] hover:text-[#007e3a] dark:hover:text-[#00c857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-900"
          >
            {loading && view === "list"
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Fetching…</>
              : <><List className="w-3 h-3" /> Preview items</>
            }
          </button>

          {/* JSON button — always enabled if URL is present */}
          <button
            type="button"
            disabled={urlEmpty || loading}
            onClick={handleShowJson}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${view === "json"
                ? "border-[#007e3a] text-[#007e3a] bg-[#007e3a]/10 dark:bg-[#007e3a]/20"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#007e3a] hover:text-[#007e3a] dark:hover:text-[#00c857] bg-white dark:bg-slate-900"
              }`}
          >
            {loading && view === "json"
              ? <><Loader2 className="w-3 h-3 animate-spin" /> JSON</>
              : <><Code className="w-3 h-3" /> JSON</>
            }
          </button>

          {/* Refresh button — visible after first fetch */}
          {hasData && (
            <button
              type="button"
              disabled={urlEmpty || loading}
              onClick={() => runFetch(view ?? "list")}
              title="Refresh"
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#007e3a] hover:text-[#007e3a] dark:hover:text-[#00c857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-900"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>

        {count !== null && !loading && view !== "json" && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {count} item{count !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded p-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* JSON view */}
      {view === "json" && raw && !loading && (
        <div className="rounded border border-slate-700 overflow-hidden bg-[#1e1e1e] p-3 max-h-60 overflow-y-auto">
          <pre className="text-[10px] text-[#4ade80] font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      )}

      {/* List view */}
      {view === "list" && options.length > 0 && !loading && (
        <div className="rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-mono flex-shrink-0 w-16 truncate">{opt.id}</span>
                <span className="text-slate-700 dark:text-slate-200 truncate">{opt.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {view === "list" && options.length === 0 && !loading && !error && raw && (
        <div className="rounded border border-slate-200 dark:border-slate-700 p-3 text-center text-xs text-slate-400">
          No items parsed. Check your ID Field, Label Field, and Results Key settings.
        </div>
      )}
    </div>
  );
}
