import React, { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown, X, Plus, AlertCircle } from "lucide-react";
import { FlowField } from "../types";
import { FIELD_TYPES } from "../utils/constants";
import { ApiConfigPanel } from "./ApiConfigPanel";
import { uid } from "../utils";



export function FieldRow({
  field, fieldIndex, onUpdate, onRemove, error,
}: {
  field: FlowField; fieldIndex: number;
  onUpdate: (f: FlowField) => void; onRemove: () => void; error?: string;
}) {
  const [open, setOpen] = useState(true);
  const hasOptions = ["dropdown", "radio", "checkbox"].includes(field.type);
  const meta = FIELD_TYPES.find(t => t.type === field.type)!;



  return (
    <div className={`rounded-lg border ${error ? "border-rose-300 dark:border-rose-600" : "border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-900`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
        <input
          className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400 min-w-0"
          placeholder="Field Label"
          value={field.label}
          onChange={e => onUpdate({ ...field, label: e.target.value })}
        />
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer flex-shrink-0">
          <input type="checkbox" checked={field.required} onChange={e => onUpdate({ ...field, required: e.target.checked })} className="accent-[#007e3a] w-3 h-3" />
          Required
        </label>
        <button type="button" onClick={() => setOpen(p => !p)} className="p-0.5 text-slate-400 hover:text-slate-600 rounded">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={onRemove} className="p-0.5 text-slate-300 hover:text-rose-500 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="px-10 py-3 space-y-3 bg-white dark:bg-slate-900/30 rounded-b-lg border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Variable Name (Machine Key)</label>
              <input
                className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors"
                placeholder=""
                value={field.name || ""}
                onChange={e => onUpdate({ ...field, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              />
            </div>
            <div className="flex-1" />
          </div>

          {hasOptions && (
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Options</label>
              {field.options.map(opt => (
                <div key={opt.id} className="flex items-center gap-2 group">
                  <div className={`w-3.5 h-3.5 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${field.type === "radio" ? "rounded-full" : "rounded-sm"}`}>
                  </div>
                  <input
                    className="flex-1 bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] transition-colors"
                    placeholder=""
                    value={opt.label}
                    onChange={e => onUpdate({ ...field, options: field.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o) })}
                  />
                  <button type="button" onClick={() => onUpdate({ ...field, options: field.options.filter(o => o.id !== opt.id) })} className="text-slate-300 hover:text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => onUpdate({ ...field, options: [...field.options, { id: uid(), label: "" }] })} className="flex items-center gap-1 text-xs text-[#007e3a] hover:text-[#00662e] font-medium">
                <Plus className="w-3 h-3" /> Add option
              </button>
            </div>
          )}


          {/* API config — only for API-backed field types */}
          {(field.type === "dynamic_dropdown" || field.type === "dynamic_checkbox") && (
            <ApiConfigPanel field={field} onUpdate={onUpdate} />
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-rose-200 dark:border-rose-800 text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
