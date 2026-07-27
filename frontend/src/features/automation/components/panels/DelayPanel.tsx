import React from "react";
import { FieldGroup, FieldSelect, FieldInput } from "../ui/FormFields";
import { Clock, Info } from "lucide-react";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function DelayPanel({ nodeId, data, update }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-50/80 dark:bg-slate-900/40 border-l-4 border-l-blue-500 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Wait Duration
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Amount</label>
            <FieldInput
              type="number"
              min={1}
              value={(data.delayValue as number) ?? 5}
              onChange={(e) => update(nodeId, { delayValue: parseInt(e.target.value) || 1 })}
              focus="focusPurple"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Time Unit</label>
            <FieldSelect
              value={(data.delayUnit as string) || "minutes"}
              onChange={(e) => update(nodeId, { delayUnit: e.target.value })}
              focus="focusPurple"
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </FieldSelect>
          </div>
        </div>
      </div>

      <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl flex items-start gap-2.5 shadow-2xs">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
          The workflow will pause here for the exact duration specified before executing the next block in the sequence.
        </p>
      </div>
    </div>
  );
}

