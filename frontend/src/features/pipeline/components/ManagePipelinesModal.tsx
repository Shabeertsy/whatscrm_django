import React, { useState } from "react";
import { X, Zap, Trash2, Plus, Edit2, Check } from "lucide-react";
import { Pipeline } from "../api";

interface Props {
  pipelines: Pipeline[];
  onClose: () => void;
  onActivate: (id: string) => void;
  onDelete: (pipeline: Pipeline) => void;
  onUpdate: (id: string, data: { name: string; description: string }) => Promise<boolean>;
  onCreateNew: () => void;
}

export function ManagePipelinesModal({ pipelines, onClose, onActivate, onDelete, onUpdate, onCreateNew }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  const startEditing = (p: Pipeline) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description || "" });
  };

  const handleSave = async (id: string) => {
    const ok = await onUpdate(id, editForm);
    if (ok) {
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Manage Pipelines</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
          {pipelines.map(p => {
            const isEditing = editingId === p.id;

            return (
              <div key={p.id} className="flex items-start justify-between px-6 py-4">
                {isEditing ? (
                  <div className="flex-1 min-w-0 mr-4 space-y-3">
                    <div>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#007e3a]"
                        placeholder="Pipeline Name"
                        autoFocus
                      />
                    </div>
                    <div>
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#007e3a] min-h-[60px]"
                        placeholder="Description"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSave(p.id)}
                        className="px-3 py-1 bg-[#007e3a] text-white text-xs font-bold rounded-md hover:bg-[#00662f] transition-colors flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{p.name}</span>
                      {p.is_active && (
                        <span className="px-2 py-0.5 bg-[#007e3a]/10 text-[#007e3a] text-[10px] font-bold rounded-full">ACTIVE</span>
                      )}
                      {p.auto_create_deals && <Zap className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.deal_count} deals · {p.stages.length} stages</p>
                    {p.description && (
                      <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{p.description}</p>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEditing(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Pipeline"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!p.is_active && (
                      <>
                        <button
                          onClick={() => onActivate(p.id)}
                          className="px-3 py-1.5 border border-[#007e3a] text-[#007e3a] text-xs font-bold rounded-lg hover:bg-[#007e3a]/5 transition-colors"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => onDelete(p)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Pipeline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-[#007e3a] hover:text-[#007e3a] text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Create New Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
