import React from "react";
import { Plus, X } from "lucide-react";
import { FieldGroup, FieldTextarea } from "../ui/FormFields";

interface Option {
  id: string;
  label: string;
  value: string;
}

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

/** Returns how this set of options would be delivered on WhatsApp */
function getDeliveryPreview(count: number): { label: string; color: string; detail: string } {
  if (count === 0) return { label: "–", color: "slate", detail: "Add options to see delivery mode" };
  if (count <= 3) return { label: "Reply Buttons", color: "green", detail: "Sent as 3 tappable inline buttons" };
  if (count <= 10) return { label: "List Message", color: "blue", detail: `Sent as a scrollable list (${count} rows)` };
  const pages = Math.ceil(count / 10);
  return { label: "Paginated Lists", color: "amber", detail: `Split into ${pages} list messages (${count} options total)` };
}

const colorMap: Record<string, string> = {
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  green: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};

export function MenuOptionsPanel({ nodeId, data, update }: Props) {
  const options: Option[] = Array.isArray(data.options) ? (data.options as Option[]) : [];
  const preview = getDeliveryPreview(options.length);

  const patchOptions = (next: Option[]) => update(nodeId, { options: next });

  const add = () => {
    const num = options.length + 1;
    patchOptions([
      ...options,
      { id: `opt_${Date.now()}_${num}`, label: `Option ${num}`, value: `${num}` },
    ]);
  };

  const remove = (i: number) => {
    const next = options
      .filter((_, idx) => idx !== i)
      .map((o, idx) => ({ ...o, value: `${idx + 1}` }));
    patchOptions(next);
  };

  const setLabel = (i: number, label: string) => {
    patchOptions(options.map((o, idx) => (idx === i ? { ...o, label } : o)));
  };

  return (
    <div className="space-y-4">
      {/* ── Prompt Message ── */}
      <FieldGroup label="Prompt Message">
        <FieldTextarea
          value={(data.message as string) || ""}
          onChange={(e) => update(nodeId, { message: e.target.value })}
          placeholder="Enter prompt message for user..."
          rows={2}
          focus="focusOrange"
        />
      </FieldGroup>

      {/* ── Wrong Option Message ── */}
      <FieldGroup label="Wrong Option / Invalid Reply Message">
        <FieldTextarea
          value={
            (data.invalidOptionMessage as string) ||
            (data.noMatchMessage as string) ||
            ""
          }
          onChange={(e) =>
            update(nodeId, {
              invalidOptionMessage: e.target.value,
              noMatchMessage: e.target.value,
            })
          }
          placeholder="Message sent if user selects an invalid option"
          rows={2}
          focus="focusOrange"
        />
      </FieldGroup>

      {/* ── Options List ── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Menu Options
            <span className="ml-1.5 text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
              {options.length}
            </span>
          </span>
          <button
            onClick={add}
            className="text-orange-500 hover:bg-orange-500/10 dark:hover:bg-orange-500/20 p-1.5 rounded transition text-xs font-semibold flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add Option</span>
          </button>
        </div>

        <div className="space-y-3">
          {options.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">
              No menu options added yet.
            </p>
          )}

          {options.map((opt, i) => (
            <div
              key={opt.id || i}
              className="bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-3 relative group"
            >
              <button
                onClick={() => remove(i)}
                className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove option"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-medium text-slate-400">
                  Option Label
                </label>
                <span className="text-[10px] font-mono font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded">
                  #{i + 1}
                </span>
              </div>
              <input
                type="text"
                value={opt.label || ""}
                onChange={(e) => setLabel(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── WhatsApp Delivery Preview ── */}
      <div className={`rounded-xl border px-3 py-2.5 ${colorMap[preview.color]}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
            WhatsApp Delivery
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/40 dark:bg-black/20">
            {preview.label}
          </span>
        </div>
        <p className="text-[11px] mt-0.5 font-medium opacity-80">{preview.detail}</p>
        {options.length > 10 && (
          <p className="text-[10px] mt-1 opacity-60">
            Options are split automatically — each page has up to 10 rows.
          </p>
        )}
      </div>
    </div>
  );
}
