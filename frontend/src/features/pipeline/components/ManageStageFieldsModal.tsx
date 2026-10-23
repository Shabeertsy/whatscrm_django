import React, { useState } from "react";
import { X, Plus, Trash2, GripVertical, AlertTriangle } from "lucide-react";
import { StageField } from "../api";



interface ManageStageFieldsModalProps {
  stageTitle: string;
  existingFields: StageField[];
  onClose: () => void;
  onSave: (fields: StageField[]) => void;
}

const FIELD_TYPES: { value: StageField['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown (Select)' },
];

function labelToKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function ManageStageFieldsModal({
  stageTitle, existingFields, onClose, onSave
}: ManageStageFieldsModalProps) {
  const [fields, setFields] = useState<StageField[]>(existingFields.map(f => ({ ...f })));
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<StageField['type']>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [keyError, setKeyError] = useState('');

  const handleAddField = () => {
    if (!newLabel.trim()) return;
    const key = labelToKey(newLabel.trim());
    if (!key) { setKeyError('Invalid label — use letters and numbers only.'); return; }
    if (fields.some(f => f.key === key)) {
      setKeyError(`A field with key "${key}" already exists.`);
      return;
    }
    setKeyError('');
    const field: StageField = {
      key,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      ...(newType === 'select' && newOptions.trim()
        ? { options: newOptions.split(',').map(o => o.trim()).filter(Boolean) }
        : {}),
    };
    setFields(prev => [...prev, field]);
    setNewLabel('');
    setNewType('text');
    setNewRequired(false);
    setNewOptions('');
  };

  const handleDelete = (key: string) => {
    if (deleteConfirm !== key) {
      setDeleteConfirm(key);
      setTimeout(() => setDeleteConfirm(null), 3000);
    } else {
      setFields(prev => prev.filter(f => f.key !== key));
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Manage Extra Fields</h3>
            <p className="text-xs text-slate-500 mt-0.5">Stage: <span className="font-semibold text-slate-700 dark:text-slate-300">{stageTitle}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Fields */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <GripVertical className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No extra fields yet</p>
              <p className="text-xs mt-1">Add fields below to collect additional booking info</p>
            </div>
          ) : (
            fields.map(field => (
              <div
                key={field.key}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{field.label}</p>
                    {field.required && (
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex-shrink-0">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 font-mono">key: {field.key}</span>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[11px] text-slate-400 capitalize">{field.type}</span>
                    {field.options && field.options.length > 0 && (
                      <span className="text-[11px] text-slate-400 truncate">· {field.options.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(field.key)}
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                    deleteConfirm === field.key
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                  title={deleteConfirm === field.key ? 'Click again to confirm delete' : 'Delete field'}
                >
                  {deleteConfirm === field.key
                    ? <AlertTriangle className="h-3.5 w-3.5" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            ))
          )}

          {/* Add New Field */}
          <div className="border border-dashed border-[#007e3a]/40 rounded-lg p-4 space-y-3 mt-4">
            <p className="text-xs font-bold text-[#007e3a] uppercase tracking-wider">Add New Field</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Field Label *</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => { setNewLabel(e.target.value); setKeyError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddField()}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                  placeholder="e.g. Check-in Date"
                />
                {newLabel && (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">key: {labelToKey(newLabel) || '—'}</p>
                )}
                {keyError && <p className="text-[11px] text-red-500 mt-0.5">{keyError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Field Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as StageField['type'])}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={e => setNewRequired(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#007e3a]"
                  />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Required</span>
                </label>
              </div>

              {newType === 'select' && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Options <span className="text-slate-400 font-normal">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={newOptions}
                    onChange={e => setNewOptions(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#007e3a]"
                    placeholder="e.g. Breakfast, Lunch, Dinner"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddField}
              disabled={!newLabel.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#007e3a]/10 hover:bg-[#007e3a]/20 text-[#007e3a] rounded-lg text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add Field
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(fields); onClose(); }}
            className="px-5 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-sm font-bold rounded-lg transition-colors"
          >
            Save Fields
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageStageFieldsModal;
