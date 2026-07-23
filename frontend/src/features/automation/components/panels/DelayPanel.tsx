import React from "react";
import { FieldGroup, FieldSelect, FieldInput } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function DelayPanel({ nodeId, data, update }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Delay Settings
      </p>
      <div className="flex space-x-2">
        <div className="w-1/2">
          <label className="text-[10px] text-slate-400 block mb-1">Duration</label>
          <FieldInput
            type="number"
            min={1}
            value={(data.delayValue as number) ?? 5}
            onChange={(e) => update(nodeId, { delayValue: parseInt(e.target.value) || 1 })}
            focus="focusGreen"
          />
        </div>
        <div className="w-1/2">
          <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
          <FieldSelect
            value={(data.delayUnit as string) || "minutes"}
            onChange={(e) => update(nodeId, { delayUnit: e.target.value })}
            focus="focusGreen"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </FieldSelect>
        </div>
      </div>
    </div>
  );
}
