import React, { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
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

const ROW_CLS = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]";

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
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Conditions
        </span>
        <button
          onClick={add}
          className="text-[#007e3a] hover:bg-[#007e3a]/10 dark:hover:bg-[#007e3a]/20 p-1 rounded transition text-xs font-semibold flex items-center space-x-1"
        >
          <Plus className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>

      <div className="space-y-3">
        {conditions.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">
            No conditions added. Branch defaults to No.
          </p>
        )}

        {conditions.map((cond, i) => (
          <div
            key={i}
            className="bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 relative group"
          >
            <button
              onClick={() => remove(i)}
              className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove condition"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex space-x-2 pr-6">
              <select value={cond.field || "message"} onChange={(e) => set(i, "field", e.target.value)} className={`w-1/2 ${ROW_CLS}`}>
                <option value="message">Message text</option>
                <option value="user_tag">User Tag</option>
              </select>
              <select value={cond.operator || "exact"} onChange={(e) => set(i, "operator", e.target.value)} className={`w-1/2 ${ROW_CLS}`}>
                <option value="exact">Exact</option>
                <option value="contains">Contains</option>
                <option value="not_contain">Not contain</option>
                {cond.field !== 'user_tag' && <option value="starts_with">Starts with</option>}
              </select>
            </div>

            {cond.field === "user_tag" ? (
              loadingTags ? (
                <div className={`w-full flex items-center justify-center ${ROW_CLS}`}>
                   <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                </div>
              ) : (
                <select 
                  value={(cond.value || "").toLowerCase()} 
                  onChange={(e) => set(i, "value", e.target.value)} 
                  className={`w-full ${ROW_CLS}`}
                >
                  <option value="" disabled>
                    {availableTags.length === 0 ? "No tags found in CRM" : "Select a tag..."}
                  </option>
                  {availableTags.map(tag => (
                    <option key={tag.id} value={tag.name.toLowerCase()}>{tag.name}</option>
                  ))}
                </select>
              )
            ) : (
              <input
                type="text"
                value={cond.value || ""}
                onChange={(e) => set(i, "value", e.target.value)}
                placeholder="Value..."
                className={`w-full ${ROW_CLS}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
