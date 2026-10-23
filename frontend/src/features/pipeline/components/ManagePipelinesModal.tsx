import React, { useState, useEffect } from "react";
import { X, Zap, Trash2, Plus, Edit2, Check, Tag, ArrowLeft, Layers } from "lucide-react";
import { Pipeline, PipelineField } from "../api";
import { PipelineFieldsEditor } from "./PipelineFieldsEditor";



interface Props {
  pipelines: Pipeline[];
  initialPipelineId?: string | null;
  onClose: () => void;
  onActivate: (id: string) => void;
  onDelete: (pipeline: Pipeline) => void;
  onUpdate: (id: string, data: Partial<Pipeline>) => Promise<boolean>;
  onCreateNew: () => void;
}

export function ManagePipelinesModal({
  pipelines,
  initialPipelineId,
  onClose,
  onActivate,
  onDelete,
  onUpdate,
  onCreateNew,
}: Props) {
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editFields, setEditFields] = useState<PipelineField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = (p: Pipeline) => {
    setEditingPipeline(p);
    setEditForm({ name: p.name, description: p.description || "" });
    setEditFields(p.extra_fields ? [...p.extra_fields] : []);
  };

  useEffect(() => {
    if (initialPipelineId) {
      const target = pipelines.find(p => p.id === initialPipelineId);
      if (target) startEditing(target);
    }
  }, [initialPipelineId, pipelines]);

  const handleSave = async () => {
    if (!editingPipeline) return;
    if (!editForm.name.trim()) return;

    setIsSaving(true);
    try {
      const ok = await onUpdate(editingPipeline.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        extra_fields: editFields,
      });
      if (ok) {
        setEditingPipeline(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {editingPipeline && (
              <button
                type="button"
                onClick={() => setEditingPipeline(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to all pipelines"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                {editingPipeline ? `Edit: ${editingPipeline.name}` : "Manage Pipelines"}
                {editingPipeline?.is_active && (
                  <span className="px-2 py-0.5 bg-[#007e3a]/10 text-[#007e3a] text-[10px] font-bold rounded-full">
                    ACTIVE
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingPipeline
                  ? "Configure pipeline details and deal custom fields"
                  : "View, switch, and customize your sales pipelines"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        {editingPipeline ? (
          /* ── Dedicated Edit View ── */
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">
            {/* Pipeline Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Pipeline Name *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a]"
                placeholder="e.g. WhatsApp Bookings"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] focus:ring-1 focus:ring-[#007e3a] min-h-[64px]"
                placeholder="Optional description of this pipeline's purpose"
              />
            </div>

            {/* Custom Deal Fields Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <PipelineFieldsEditor
                fields={editFields}
                onChange={setEditFields}
              />
            </div>
          </div>
        ) : (
          /* ── Pipeline List View ── */
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-3">
            {pipelines.map(p => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all ${p.is_active
                  ? "bg-[#007e3a]/[0.02] border-[#007e3a]/40 shadow-sm"
                  : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900 dark:text-white truncate">
                        {p.name}
                      </span>
                      {p.is_active && (
                        <span className="px-2 py-0.5 bg-[#007e3a]/15 text-[#007e3a] text-[10px] font-bold rounded-full">
                          ACTIVE
                        </span>
                      )}
                      {p.auto_create_deals && (
                        <span
                          title="Auto-creates deals from incoming messages"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full"
                        >
                          <Zap className="h-3 w-3" /> Auto-Deals
                        </span>
                      )}
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400 flex-wrap">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {p.deal_count} {p.deal_count === 1 ? "deal" : "deals"}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {p.stages.length} {p.stages.length === 1 ? "stage" : "stages"}
                      </span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => startEditing(p)}
                        className="inline-flex items-center gap-1 text-[#007e3a] font-semibold bg-[#007e3a]/10 hover:bg-[#007e3a]/20 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <Tag className="h-3 w-3" />
                        {p.extra_fields?.length || 0} custom fields
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(p)}
                      className="px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:text-[#007e3a] bg-slate-100 dark:bg-slate-700/60 hover:bg-[#007e3a]/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="Edit Pipeline & Custom Fields"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    {!p.is_active && (
                      <>
                        <button
                          type="button"
                          onClick={() => onActivate(p.id)}
                          className="px-3 py-1.5 border border-[#007e3a] text-[#007e3a] text-xs font-bold rounded-lg hover:bg-[#007e3a]/5 transition-colors"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Pipeline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          {editingPipeline ? (
            <>
              <button
                type="button"
                onClick={() => setEditingPipeline(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !editForm.name.trim()}
                className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onCreateNew}
                className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Pipeline</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default ManagePipelinesModal;
