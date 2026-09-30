import React from "react";
import { Monitor, Trash2, AlertCircle } from "lucide-react";
import { FlowScreen, FieldType } from "../types";
import { FIELD_TYPES } from "../utils/constants";
import { FieldRow } from "./FieldRow";
import { uid } from "../utils";



export function ScreenCard({
  screen, index, total, onUpdate, onRemove, errors,
}: {
  screen: FlowScreen; index: number; total: number;
  onUpdate: (s: FlowScreen) => void;
  onRemove: () => void;
  errors: Record<string, string>;
}) {
  const addField = (type: FieldType) => {
    onUpdate({ ...screen, fields: [...screen.fields, { id: `field_${uid()}`, type, label: "", required: false, options: [] }] });
  };



  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Screen header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#007e3a]/10 text-[#007e3a] text-xs font-bold flex items-center justify-center border border-[#007e3a]/20">
          {index + 1}
        </span>
        <input
          className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400 min-w-0"
          placeholder="Screen Title"
          value={screen.title}
          onChange={e => onUpdate({ ...screen, title: e.target.value })}
        />
        {index === total - 1 && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">Final</span>
        )}
        <span className="text-xs text-slate-400 flex-shrink-0">{screen.fields.length} field{screen.fields.length !== 1 ? "s" : ""}</span>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove this screen"
            className="ml-auto flex-shrink-0 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {errors[`screen_${screen.id}_title`] && (
        <p className="px-3 py-1 text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 flex items-center gap-1 border-t border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3 h-3" /> {errors[`screen_${screen.id}_title`]}
        </p>
      )}

      {/* Fields */}
      <div className="p-3 space-y-2 bg-white dark:bg-slate-900/30">
        {screen.fields.map((field, fIdx) => (
          <FieldRow
            key={field.id}
            field={field}
            fieldIndex={fIdx}
            onUpdate={updated => onUpdate({ ...screen, fields: screen.fields.map(f => f.id === field.id ? updated : f) })}
            onRemove={() => onUpdate({ ...screen, fields: screen.fields.filter(f => f.id !== field.id) })}
            error={errors[`field_${field.id}`]}
          />
        ))}

        {/* Add field buttons */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {FIELD_TYPES.map(({ type, icon, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => addField(type)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#007e3a] hover:text-[#007e3a] dark:hover:text-[#00c857] transition-colors bg-white dark:bg-slate-800"
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
