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
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
        <div className="flex items-center gap-1.5 text-slate-500 flex-shrink-0">
          {meta.icon}
          <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
        </div>
        <div className="flex-1 px-3 border-l border-slate-200 dark:border-slate-700 ml-2">
          {field.label ? (
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate block">{field.label}</span>
          ) : (
            <span className="text-sm italic text-slate-400 block">No label set</span>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer flex-shrink-0 ml-auto mr-2">
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
        <div className="p-4 space-y-4 bg-white dark:bg-slate-900/30 rounded-b-lg border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Field Label <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]/30 transition-colors shadow-sm"
                value={field.label}
                onChange={e => onUpdate({ ...field, label: e.target.value })}
              />
              <p className="text-[10px] text-slate-500 mt-1">The question or prompt shown to the user.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Variable Name (Machine Key)
              </label>
              <input
                className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]/30 transition-colors shadow-sm"
                placeholder="e.g. user_name"
                value={field.name || ""}
                onChange={e => onUpdate({ ...field, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              />
              <p className="text-[10px] text-slate-500 mt-1">Used in API responses to identify this data.</p>
            </div>
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
