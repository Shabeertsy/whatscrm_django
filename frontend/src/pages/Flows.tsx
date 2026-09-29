import React, { useEffect, useRef, useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import { flowsApi } from "../api/flows";
import { whatsappApi } from "../api/whatsapp";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import {
  Plus, Trash2, Globe, Loader2, Layers, ChevronDown, ChevronUp,
  Monitor, TextCursor, List, CheckSquare, Circle, AlignLeft, GripVertical, X,
  Copy, Check, Code2, AlertCircle, BarChart2
} from "lucide-react";



type FieldType = "text_input" | "textarea" | "dropdown" | "radio" | "checkbox" | "dynamic_dropdown" | "dynamic_checkbox";

interface FieldOption { id: string; label: string; }

/** Config for a dynamic dropdown backed by an external API */
interface ApiConfig {
  url: string;          // e.g. "https://api.example.com/products/"
  id_field: string;     // JSON key to use as option id      (default "id")
  label_field: string;  // JSON key to use as option title   (default "name")
  results_key: string;  // Nested key path e.g. "results" or "data.items" (leave blank if top-level array)
  filter_param: string; // field_id of previous field whose value is sent as query param
  screen: string;       // which screen id this field belongs to (auto-set)
  headers: Record<string, string>; // Optional auth headers
}

interface FlowField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options: FieldOption[];
  apiConfig?: ApiConfig; // Only used for dynamic_dropdown / dynamic_checkbox
}

interface FlowScreen { id: string; title: string; fields: FlowField[]; }



const uid = () => Math.random().toString(36).slice(2, 8);

const FIELD_TYPES: { type: FieldType; icon: React.ReactNode; label: string }[] = [
  { type: "text_input",       icon: <TextCursor  className="w-3.5 h-3.5" />, label: "Short Text"         },
  { type: "textarea",         icon: <AlignLeft   className="w-3.5 h-3.5" />, label: "Long Text"          },
  { type: "dropdown",         icon: <List        className="w-3.5 h-3.5" />, label: "Dropdown"           },
  { type: "radio",            icon: <Circle      className="w-3.5 h-3.5" />, label: "Single Choice"      },
  { type: "checkbox",         icon: <CheckSquare className="w-3.5 h-3.5" />, label: "Multi Choice"       },
  // { type: "dynamic_dropdown", icon: <List        className="w-3.5 h-3.5" />, label: "API Dropdown"       },
  // { type: "dynamic_checkbox", icon: <CheckSquare className="w-3.5 h-3.5" />, label: "API Multi-Select"  },
];

const defaultApiConfig = (): ApiConfig => ({
  url: "",
  id_field: "id",
  label_field: "name",
  results_key: "",
  filter_param: "",
  screen: "",
  headers: {},
});

function buildFlowJson(screens: FlowScreen[]): object {
  return {
    version: "3.1",
    data_api_version: "3.0",
    routing_model: screens.reduce((acc, screen, idx) => {
      acc[screen.id] = idx < screens.length - 1 ? [screens[idx + 1].id] : [];
      return acc;
    }, {} as Record<string, string[]>),
    screens: screens.map((screen, idx) => {
      const isLast = idx === screens.length - 1;
      return {
        id: screen.id,
        title: screen.title,
        terminal: isLast,
        layout: {
          type: "SingleColumnLayout",
          children: [
            ...screen.fields.map((f) => {
              const base = { name: f.id, label: f.label, required: f.required };
              if (f.type === "text_input") return { type: "TextInput", input_type: "text", ...base };
              if (f.type === "textarea")   return { type: "TextArea",  ...base };
              if (f.type === "dropdown")        return { type: "Dropdown",          ...base, "data-source": f.options.map(o => ({ id: o.id, title: o.label })) };
              if (f.type === "radio")            return { type: "RadioButtonsGroup", ...base, "data-source": f.options.map(o => ({ id: o.id, title: o.label })) };
              if (f.type === "checkbox")         return { type: "CheckboxGroup",     ...base, "data-source": f.options.map(o => ({ id: o.id, title: o.label })) };
              // Dynamic types: data-source is a variable injected by the backend at runtime
              if (f.type === "dynamic_dropdown") return { type: "Dropdown",      ...base, "data-source": `\${data.${f.id}}` };
              if (f.type === "dynamic_checkbox") return { type: "CheckboxGroup", ...base, "data-source": `\${data.${f.id}}` };
              return base;
            }),
            {
              type: "Footer",
              label: isLast ? "Submit" : "Next",
              // Screens that have dynamic dropdowns need data_exchange so backend can inject data
              on_click_action: isLast
                ? { type: "complete", payload: {} }
                : hasDynamicFieldOnNextScreen(screens, idx)
                  ? { name: "data_exchange", payload: { next_screen: screens[idx + 1].id } }
                  : { type: "navigate", next: { type: "screen", name: screens[idx + 1].id }, payload: {} },
            },
          ],
        },
      };
    }),
  };
}

/** True if the screen AFTER index idx contains at least one API-backed dynamic field. */
function hasDynamicFieldOnNextScreen(screens: FlowScreen[], idx: number): boolean {
  if (idx >= screens.length - 1) return false;
  return screens[idx + 1].fields.some(f => f.type === "dynamic_dropdown" || f.type === "dynamic_checkbox");
}

/** Extract data_api_config from all screens' API-backed dynamic fields. */
function buildDataApiConfig(screens: FlowScreen[]): Record<string, object> {
  const config: Record<string, object> = {};
  for (const screen of screens) {
    for (const field of screen.fields) {
      const isDynamic = field.type === "dynamic_dropdown" || field.type === "dynamic_checkbox";
      if (isDynamic && field.apiConfig) {
        config[field.id] = { ...field.apiConfig, screen: screen.id, field_type: field.type };
      }
    }
  }
  return config;
}



function FieldRow({
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
        <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab flex-shrink-0" />
        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded flex-shrink-0">
          {meta.icon} {meta.label}
        </span>
        <input
          className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400 min-w-0"
          placeholder={`Field ${fieldIndex + 1} label`}
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
        <div className="px-3 py-2.5 space-y-2">
          {(field.type === "text_input" || field.type === "textarea") && (
            <input
              className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-[#007e3a]"
              placeholder="Placeholder text (optional)"
              value={field.placeholder || ""}
              onChange={e => onUpdate({ ...field, placeholder: e.target.value })}
            />
          )}
          {hasOptions && (
            <div className="space-y-1.5">
              {field.options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{i + 1}.</span>
                  <input
                    className="flex-1 bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007e3a]"
                    placeholder={`Option ${i + 1}`}
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

function ApiConfigPanel({ field, onUpdate }: { field: FlowField; onUpdate: (f: FlowField) => void }) {
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



function ScreenCard({
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
        <Monitor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400 min-w-0"
          placeholder={`Screen ${index + 1} title`}
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



function FlowCard({ flow, onDelete, onPublish }: { flow: any; onDelete: () => void; onPublish: () => void }) {
  const isPublished = flow.status === "PUBLISHED";
  return (
    <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">{flow.name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {flow.category?.replace(/_/g, " ")}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${isPublished ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isPublished && (
            <button onClick={onPublish} title="Publish to Meta" className="p-1.5 text-slate-400 hover:text-[#007e3a] transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              <Globe className="h-4 w-4" />
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <BarChart2 className="w-3.5 h-3.5 text-[#007e3a]" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{flow.submission_count ?? 0}</span> submissions
        </div>
        <span className="text-slate-400">{new Date(flow.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}



export default function Flows() {
  const [flows, setFlows]         = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isFormOpen, setIsFormOpen]       = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [jsonCopied, setJsonCopied]       = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [formData, setFormData]           = useState({ name: "", category: "APPOINTMENT_BOOKING", instance: "" });
  const [activeScreenIdx, setActiveScreenIdx] = useState(0);
  const [confirmState, setConfirmState]   = useState<{
    open: boolean; title: string; description: string;
    isDestructive?: boolean; onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const defaultScreen = (): FlowScreen => ({ id: `SCREEN_${uid().toUpperCase()}`, title: "", fields: [] });
  const [screens, setScreens] = useState<FlowScreen[]>([defaultScreen()]);

  const previewJson = JSON.stringify(buildFlowJson(screens), null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(previewJson).then(() => {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [flowsRes, instRes] = await Promise.all([flowsApi.listFlows(), whatsappApi.listInstances()]);
      setFlows(Array.isArray(flowsRes.data) ? flowsRes.data : (flowsRes.data as any).results || []);
      const loaded = Array.isArray(instRes.data) ? instRes.data : (instRes.data as any).results || [];
      setInstances(loaded);
      if (loaded.length > 0 && !formData.instance) setFormData(p => ({ ...p, instance: loaded[0].id }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openForm = () => {
    setScreens([defaultScreen()]);
    setFormData(p => ({ ...p, name: "", category: "APPOINTMENT_BOOKING" }));
    setErrors({});
    setActiveScreenIdx(0);
    setIsFormOpen(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim())  errs.name     = "Flow name is required.";
    if (!formData.instance)     errs.instance = "Please select a WhatsApp instance.";
    for (const screen of screens) {
      if (!screen.title.trim()) errs[`screen_${screen.id}_title`] = "Title is required.";
      for (const field of screen.fields) {
        if (!field.label.trim()) errs[`field_${field.id}`] = "Label is required.";
        else if (["dropdown","radio","checkbox"].includes(field.type) && field.options.length < 2) errs[`field_${field.id}`] = "Add at least 2 options.";
        else if (["dropdown","radio","checkbox"].includes(field.type) && field.options.some(o => !o.label.trim())) errs[`field_${field.id}`] = "All options need a label.";
        else if (["dynamic_dropdown","dynamic_checkbox"].includes(field.type) && !field.apiConfig?.url?.trim()) errs[`field_${field.id}`] = "API URL is required for dynamic fields.";
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
        data_api_config: buildDataApiConfig(screens), // ← API configs for dynamic dropdowns
      });
      setIsFormOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrors({ submit: `Failed to create flow: ${err.response?.data?.error || err.message}` });
    } finally { setIsSubmitting(false); }
  };

  const closeConfirm = () => setConfirmState(s => ({ ...s, open: false }));

  const handleDelete = (id: string) => {
    setConfirmState({
      open: true,
      title: "Delete Flow",
      description: "This flow will be permanently deleted. This action cannot be undone.",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        try { await flowsApi.deleteFlow(id); await fetchData(); }
        catch (err: any) { alert(`Failed to delete: ${err.response?.data?.error || err.message}`); }
      },
    });
  };

  const handlePublish = (id: string) => {
    setConfirmState({
      open: true,
      title: "Publish to Meta",
      description: "Once published, this flow will go live on WhatsApp and cannot be reverted to draft.",
      isDestructive: false,
      onConfirm: async () => {
        closeConfirm();
        try { 
            await flowsApi.uploadJson(id);
            await flowsApi.publishFlow(id); 
            await fetchData(); 
        }
        catch (err: any) { alert(`Failed to publish: ${err.response?.data?.error || err.message}`); }
      },
    });
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
    <div className="space-y-6">
      <PageHeader title="WhatsApp Flows" description="Create and manage WhatsApp interactive flows.">
        <button onClick={openForm} className="flex items-center gap-2 px-4 py-2 bg-[#007e3a] text-white rounded-lg hover:bg-[#00662e] transition-colors shadow-sm text-sm font-medium">
          <Plus className="h-4 w-4" /> Create Flow
        </button>
      </PageHeader>

      {/* Flow list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-[#007e3a]" />
        </div>
      ) : flows.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {flows.map(flow => (
            <FlowCard key={flow.id} flow={flow} onDelete={() => handleDelete(flow.id)} onPublish={() => handlePublish(flow.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No flows yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center max-w-xs">
            Create your first WhatsApp interactive flow to get started.
          </p>
          <button onClick={openForm} className="flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] text-white rounded-lg hover:bg-[#00662e] transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Flow
          </button>
        </div>
      )}

      {/* Create Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Create WhatsApp Flow</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
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
                      placeholder='e.g. "Appointment Booking"'
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
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 -mb-px overflow-x-auto">
                  {screens.map((screen, idx) => {
                    const hasErr = !!errors[`screen_${screen.id}_title`] || screen.fields.some(f => !!errors[`field_${f.id}`]);
                    return (
                      <button
                        key={screen.id}
                        type="button"
                        onClick={() => setActiveScreenIdx(idx)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                          activeScreenIdx === idx
                            ? "border-[#007e3a] text-[#007e3a] dark:text-[#00c857]"
                            : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        } ${hasErr ? "text-rose-500 dark:text-rose-400" : ""}`}
                      >
                        Screen {idx + 1}
                        {idx === screens.length - 1 && (
                          <span className="text-xs text-emerald-500 font-normal">✓</span>
                        )}
                        {hasErr && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />}
                        {screens.length > 1 && (
                          <span
                            role="button"
                            onClick={e => { e.stopPropagation(); removeScreen(screen.id); }}
                            className="ml-1 text-slate-300 hover:text-rose-500 transition-colors leading-none"
                            title="Remove screen"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {/* Add screen tab */}
                  <button
                    type="button"
                    onClick={addScreen}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-[#007e3a] dark:hover:text-[#00c857] border-b-2 border-transparent transition-colors whitespace-nowrap"
                    title="Add a new screen"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Screen
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
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" form="create-flow-form" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-[#007e3a] hover:bg-[#00662e] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Flow"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        isDestructive={confirmState.isDestructive}
        confirmLabel={confirmState.isDestructive ? "Delete" : "Publish"}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
