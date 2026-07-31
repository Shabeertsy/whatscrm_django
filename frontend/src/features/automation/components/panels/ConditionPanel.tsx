import React, { useState, useEffect } from "react";
import { Plus, X, Loader2, GitBranch, Filter, Trash2, ShieldQuestion } from "lucide-react";
import { contactsApi } from "../../../../api/contacts";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

const ROW_CLS = "w-full bg-white dark:bg-[#131924] border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs";

export function ConditionPanel({ nodeId, data, update }: Props) {
  const conditions: Condition[] = Array.isArray(data.conditions) ? (data.conditions as Condition[]) : [];
  
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const res = await contactsApi.getTags();
        setAvailableTags(res.data);
      } catch (e) {
        console.error("Failed to load tags:", e);
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, []);

  const patch = (next: Condition[]) => update(nodeId, { conditions: next });

  const add = () => patch([...conditions, { field: "message", operator: "equals", value: "" }]);

  const remove = (i: number) => {
    const next = [...conditions];
    next.splice(i, 1);
    patch(next);
  };

  const set = (i: number, key: keyof Condition, value: string) => {
    const next = conditions.map((c, idx) => idx === i ? { ...c, [key]: value } : c);
    patch(next);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Routing Rules ({conditions.length})
        </span>
        <button
          onClick={add}
          className="flex items-center gap-1 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Rule</span>
        </button>
      </div>

      <div className="space-y-3.5">
        {conditions.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/20 transition-all hover:border-amber-500/50">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldQuestion className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">No Routing Rules Defined</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] mx-auto leading-relaxed mb-4">
              Without any conditions, all incoming chats will default to taking the <span className="font-bold text-rose-500">Else</span> branch.
            </p>
            <button
              onClick={add}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Rule</span>
            </button>
          </div>
        )}

        {conditions.map((cond, i) => (
          <div
            key={i}
            className="bg-slate-50/80 dark:bg-slate-900/40 border-l-4 border-l-amber-500 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Condition #{i + 1}
              </span>
              <button
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                title="Remove condition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Evaluate Field
                </label>
                <select value={cond.field || "message"} onChange={(e) => set(i, "field", e.target.value)} className={ROW_CLS}>
                  <option value="message">Message text</option>
                  <option value="user_tag">User Tag</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Operator
                </label>
                <select value={cond.operator || "exact"} onChange={(e) => set(i, "operator", e.target.value)} className={ROW_CLS}>
                  <option value="exact">Exact match</option>
                  <option value="contains">Contains</option>
                  <option value="not_contain">Does not contain</option>
                  {cond.field !== 'user_tag' && <option value="starts_with">Starts with</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Value to Match
              </label>
              {cond.field === "user_tag" ? (
                loadingTags ? (
                  <div className="flex items-center gap-2 py-2 px-3 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading tags...</span>
                  </div>
                ) : (
                  <select value={cond.value || ""} onChange={(e) => set(i, "value", e.target.value)} className={ROW_CLS}>
                    <option value="">-- Select a Tag --</option>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.name}>{tag.name}</option>
                    ))}
                  </select>
                )
              ) : (
                <input
                  type="text"
                  value={cond.value || ""}
                  onChange={(e) => set(i, "value", e.target.value)}
                  placeholder="Type keyword or phrase to match..."
                  className={ROW_CLS}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {conditions.length > 0 && (
        <div className="mt-4 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl shadow-2xs">
          <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
            Conditions are evaluated in order. Execution flows down the branch of the <span className="font-bold">first matching rule</span>. If none match, it routes to <span className="font-bold text-rose-600 dark:text-rose-400">Else</span>.
          </p>
        </div>
      )}
    </div>
  );
}

