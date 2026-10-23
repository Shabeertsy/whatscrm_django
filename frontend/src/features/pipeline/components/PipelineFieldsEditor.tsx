import React, { useState } from "react";
import { Plus, Trash2, Tag, Type, Hash, Calendar, ListFilter, AlertCircle } from "lucide-react";
import { PipelineField } from "../api";

interface PipelineFieldsEditorProps {
  fields: PipelineField[];
  onChange: (fields: PipelineField[]) => void;
}

export const FIELD_TYPES: { value: PipelineField['type']; label: string; icon: any }[] = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'select', label: 'Dropdown', icon: ListFilter },
];

export function labelToKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function PipelineFieldsEditor({ fields, onChange }: PipelineFieldsEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<PipelineField['type']>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");
  const [keyError, setKeyError] = useState("");

  const handleAddField = () => {
    if (!newLabel.trim()) return;
    const key = labelToKey(newLabel.trim());
    if (!key) {
      setKeyError("Please use valid letters and numbers for the field name.");
      return;
    }
    if (fields.some(f => f.key === key)) {
      setKeyError(`A field named "${newLabel.trim()}" already exists.`);
      return;
    }
    setKeyError("");

    const newField: PipelineField = {
      key,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      ...(newType === 'select' && newOptions.trim()
        ? { options: newOptions.split(',').map(o => o.trim()).filter(Boolean) }
        : {}),
    };

    onChange([...fields, newField]);
    setNewLabel("");
    setNewType('text');
    setNewRequired(false);
    setNewOptions("");
  };

  const handleRemoveField = (key: string) => {
    onChange(fields.filter(f => f.key !== key));
  };

  const getTypeBadge = (type: PipelineField['type']) => {
    switch (type) {
      case 'date':
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full"><Calendar className="h-3 w-3" /> Date</span>;
      case 'number':
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full"><Hash className="h-3 w-3" /> Number</span>;
      case 'select':
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full"><ListFilter className="h-3 w-3" /> Dropdown</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-full"><Type className="h-3 w-3" /> Text</span>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-[#007e3a]" />
          Custom Deal Fields
          <span className="text-[11px] font-bold bg-[#007e3a]/10 text-[#007e3a] px-2 py-0.5 rounded-full">
            {fields.length}
          </span>
        </label>
        <span className="text-[11px] text-slate-400">
          Collected when creating/editing deals
        </span>
      </div>

      {/* Existing Fields List */}
      {fields.length > 0 ? (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {fields.map(field => (
            <div
              key={field.key}
              className="group flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-[#007e3a] transition-all"
            >
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {field.label}
                  </span>
                  {getTypeBadge(field.type)}
                  {field.required && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-1.5 py-0.2 rounded">
                      Required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                    key: {field.key}
                  </span>
                  {field.type === 'select' && field.options && field.options.length > 0 && (
                    <span className="truncate max-w-[220px] text-slate-500">
                      Options: {field.options.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveField(field.key)}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Remove custom field"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 px-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No custom fields yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Add fields below like Check-in Date, Room Type, or Budget</p>
        </div>
      )}

      {/* Add Field Section */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-3">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
          + Add New Field
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Field Label *
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={e => { setNewLabel(e.target.value); setKeyError(""); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } }}
              placeholder="e.g. Check-in Date"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Field Type
            </label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as PipelineField['type'])}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]"
            >
              {FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {newType === 'select' && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Dropdown Options (comma-separated) *
            </label>
            <input
              type="text"
              value={newOptions}
              onChange={e => setNewOptions(e.target.value)}
              placeholder="e.g. Standard Room, Deluxe Room, Suite"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={e => setNewRequired(e.target.checked)}
              className="rounded border-slate-300 text-[#007e3a] focus:ring-[#007e3a] h-4 w-4"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Required field on deal</span>
          </label>
          <button
            type="button"
            onClick={handleAddField}
            disabled={!newLabel.trim()}
            className="px-3.5 py-1.5 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add Field
          </button>
        </div>

        {keyError && (
          <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium pt-0.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{keyError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PipelineFieldsEditor;
