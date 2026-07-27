import React from "react";
import { FieldGroup, FieldSelect, FieldInput } from "../ui/FormFields";
import { Zap, Key, Info } from "lucide-react";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function TriggerPanel({ nodeId, data, update }: Props) {
  const triggerType = (data.triggerType as string) || "inbound_message";

  return (
    <div className="space-y-4">
      <div className="bg-slate-50/80 dark:bg-slate-900/40 border-l-4 border-l-amber-500 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
        <div className="pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Event Source
          </span>
        </div>

        <FieldGroup label="Trigger When...">
          <FieldSelect
            value={triggerType}
            onChange={(e) => update(nodeId, { triggerType: e.target.value })}
            focus="focusAmber"
          >
            <option value="inbound_message">Incoming Chat Message</option>
            <option value="keyword">Keyword Match</option>
            <option value="new_contact">New Contact Created</option>
            <option value="webhook">External Webhook Event</option>
          </FieldSelect>
        </FieldGroup>
      </div>

      {triggerType === "keyword" && (
        <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 space-y-3.5 shadow-2xs animate-in fade-in duration-200">
          <div className="pb-2 border-b border-amber-200/50 dark:border-amber-800/50">
            <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Keyword Filter
            </span>
          </div>

          <FieldGroup label="Match Type">
            <FieldSelect
              value={(data.matchType as string) || "contains"}
              onChange={(e) => update(nodeId, { matchType: e.target.value })}
              focus="focusAmber"
            >
              <option value="contains">Contains any of words</option>
              <option value="exact">Exact Phrase Match</option>
            </FieldSelect>
          </FieldGroup>

          <FieldGroup label="Keywords (comma separated)">
            <FieldInput
              value={(data.keywordsRaw as string) ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const arr = raw.split(",").map(k => k.trim()).filter(Boolean);
                update(nodeId, { keywordsRaw: raw, keywords: arr });
              }}
              placeholder="e.g. start, hello, help"
              focus="focusAmber"
            />
          </FieldGroup>
        </div>
      )}

      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-start gap-2.5 shadow-2xs">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
          This block acts as the entry point for your automation workflow. It will fire whenever the selected condition occurs.
        </p>
      </div>
    </div>
  );
}

