import React from "react";
import { FieldGroup, FieldSelect, FieldInput } from "../ui/FormFields";

const VARIABLES = ["{{user_input}}", "{{user_name}}", "{{user_email}}", "{{phone_number}}"];

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function SaveContactPanel({ nodeId, data, update }: Props) {
  const appendVariable = (v: string) => {
    const current = (data.fieldValue as string) || "";
    update(nodeId, { fieldValue: current ? `${current} ${v}` : v });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="Contact Field to Update">
        <FieldSelect
          value={(data.fieldToUpdate as string) || "name"}
          onChange={(e) => update(nodeId, { fieldToUpdate: e.target.value })}
          focus="focusEmerald"
        >
          <option value="name">Full Name</option>
          <option value="email">Email Address</option>
          <option value="phone">Phone Number</option>
          <option value="notes">Contact Notes</option>
        </FieldSelect>
      </FieldGroup>

      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Value to Save / Variable
        </p>
        <FieldInput
          type="text"
          value={(data.fieldValue as string) || ""}
          onChange={(e) => update(nodeId, { fieldValue: e.target.value })}
          placeholder="Type text or insert variable..."
          focus="focusEmerald"
          mono
        />
        <div className="flex flex-wrap gap-1.5 items-center mt-2">
          <span className="text-[10px] text-slate-400 font-medium">Insert variable:</span>
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => appendVariable(v)}
              className="text-[10px] font-mono bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded transition"
            >
              + {v}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Type static text or click a tag to append a variable.
        </p>
      </div>

      <FieldGroup label="Assign Tag to Contact (Optional)">
        <FieldInput
          type="text"
          value={(data.tagToAdd as string) || ""}
          onChange={(e) => update(nodeId, { tagToAdd: e.target.value })}
          placeholder="e.g. Lead, Qualified, Customer"
          focus="focusEmerald"
        />
      </FieldGroup>
    </div>
  );
}
