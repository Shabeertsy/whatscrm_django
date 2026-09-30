import React, { useState } from "react";
import { Plus, Loader2, ChevronDown, ChevronUp, X, Copy, Check, Code2, AlertCircle } from "lucide-react";
import { FlowScreen } from "../types";
import { alphaId, buildFlowJson, buildDataApiConfig } from "../utils";
import { ScreenCard } from "./ScreenCard";
import { flowsApi } from "../../../api/flows";



interface CreateFlowModalProps {
  instances: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFlowModal({ instances, onClose, onSuccess }: CreateFlowModalProps) {
  const defaultScreen = (): FlowScreen => ({ id: `SCREEN_${alphaId()}`, title: "", fields: [] });
  const [screens, setScreens] = useState<FlowScreen[]>([defaultScreen()]);
  const [formData, setFormData] = useState({ name: "", category: "APPOINTMENT_BOOKING", instance: instances.length > 0 ? instances[0].id : "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeScreenIdx, setActiveScreenIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const previewJson = JSON.stringify(buildFlowJson(screens), null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(previewJson).then(() => {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Flow name is required.";
    if (!formData.instance) errs.instance = "Please select a WhatsApp instance.";
    for (const screen of screens) {
      if (!screen.title.trim()) errs[`screen_${screen.id}_title`] = "Title is required.";
      for (const field of screen.fields) {
        if (!field.label.trim()) errs[`field_${field.id}`] = "Label is required.";
        else if (["dropdown", "radio", "checkbox"].includes(field.type) && field.options.length < 2) errs[`field_${field.id}`] = "Add at least 2 options.";
        else if (["dropdown", "radio", "checkbox"].includes(field.type) && field.options.some(o => !o.label.trim())) errs[`field_${field.id}`] = "All options need a label.";
        else if (["dynamic_dropdown", "dynamic_checkbox"].includes(field.type) && !field.apiConfig?.url?.trim()) errs[`field_${field.id}`] = "API URL is required for dynamic fields.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await flowsApi.createFlow({
        name: formData.name,
        category: formData.category,
        instance: formData.instance,
        flow_json: buildFlowJson(screens),
        data_api_config: buildDataApiConfig(screens),
      });
      onSuccess();
    } catch (err: any) {
      setErrors({ submit: `Failed to create flow: ${err.response?.data?.error || err.message}` });
      setIsSubmitting(false);
    }
  };

  const addScreen = () => {
    const newScreen = defaultScreen();
    setScreens(p => {
      const next = [...p, newScreen];
      setActiveScreenIdx(next.length - 1);
      return next;
    });
  };
  const updateScreen = (sid: string, updated: FlowScreen) => setScreens(p => p.map(s => s.id === sid ? updated : s));
  const removeScreen = (sid: string) => {
    setScreens(p => {
      const next = p.filter(s => s.id !== sid);
      setActiveScreenIdx(prev => Math.min(prev, next.length - 1));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Create WhatsApp Flow</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="create-flow-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Flow Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => { setFormData({ ...formData, name: e.target.value }); setErrors(p => ({ ...p, name: "" })); }}
                  className={`w-full bg-slate-50 dark:bg-[#131924] border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] ${errors.name ? "border-rose-400" : "border-slate-200 dark:border-slate-700"}`}
                  placeholder=""
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instance *</label>
                  <select
                    required
                    value={formData.instance}
                    onChange={e => { setFormData({ ...formData, instance: e.target.value }); setErrors(p => ({ ...p, instance: "" })); }}
                    className={`w-full bg-slate-50 dark:bg-[#131924] border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] ${errors.instance ? "border-rose-400" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    <option value="">Select instance…</option>
                    {instances.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.display_name} ({inst.phone_number_id})</option>
                    ))}
                  </select>
                  {errors.instance && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.instance}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  >
                    <option value="APPOINTMENT_BOOKING">Booking</option>
                    <option value="LEAD_GENERATION">Lead Generation</option>
                    <option value="CUSTOMER_SUPPORT">Customer Support</option>
                    <option value="SURVEY">Survey</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Screens</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            </div>

            {/* Screen Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-x-auto">
              {screens.map((screen, idx) => {
                const hasErr = !!errors[`screen_${screen.id}_title`] || screen.fields.some(f => !!errors[`field_${f.id}`]);
                const isActive = activeScreenIdx === idx;
                
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreenIdx(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      isActive 
                        ? "bg-white dark:bg-slate-700 shadow-sm text-[#007e3a] dark:text-emerald-400" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <span className={hasErr ? "text-rose-500 dark:text-rose-400" : ""}>
                      Screen {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {idx === screens.length - 1 && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                          Final
                        </span>
                      )}
                      {hasErr && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                      {screens.length > 1 && (
                        <span
                          role="button"
                          onClick={e => { e.stopPropagation(); removeScreen(screen.id); }}
                          className={`p-0.5 rounded-md transition-colors flex items-center justify-center ${isActive ? "hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-rose-500" : "hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-rose-500"}`}
                          title="Remove screen"
                        >
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {/* Add screen tab */}
              <button
                type="button"
                onClick={addScreen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[#007e3a] hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-all whitespace-nowrap"
                title="Add a new screen"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Active screen editor */}
            {screens[activeScreenIdx] && (
              <ScreenCard
                screen={screens[activeScreenIdx]}
                index={activeScreenIdx}
                total={screens.length}
                onUpdate={updated => updateScreen(screens[activeScreenIdx].id, updated)}
                onRemove={() => removeScreen(screens[activeScreenIdx].id)}
                errors={errors}
              />
            )}

            {/* Submit error */}
            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.submit}
              </div>
            )}

            {/* JSON Preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowJsonPreview(p => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Code2 className="w-3.5 h-3.5 text-slate-400" /> Preview JSON
                </span>
                {showJsonPreview ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {showJsonPreview && (
                <div className="relative bg-[#0d1117]">
                  <button type="button" onClick={copyJson} className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/80 hover:bg-slate-600 text-slate-200">
                    {jsonCopied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                  <pre className="overflow-x-auto text-xs leading-relaxed p-4 pt-9 text-[#e6edf3] font-mono max-h-64">
                    <code>{previewJson}</code>
                  </pre>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" form="create-flow-form" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-[#007e3a] hover:bg-[#00662e] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Flow"}
          </button>
        </div>

      </div>
    </div>
  );
}
