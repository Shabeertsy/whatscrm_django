import React from "react";
import { Save, Tag, UserCheck } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface SaveContactNodeProps {
  data: {
    title: string;
    description?: string;
    fieldToUpdate?: string;
    fieldValue?: string;
    tagToAdd?: string;
  };
  selected?: boolean;
}

export function SaveContactNode({ data, selected }: SaveContactNodeProps) {
  const targetField = data.fieldToUpdate || "name";
  const valueToSave = data.fieldValue || "{{user_input}}";
  const tag = data.tagToAdd;

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #34d399" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #059669",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-emerald-500 dark:border-emerald-400 shadow-lg shadow-emerald-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Save Contact
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-0.5 shrink-0">
            <UserCheck className="h-3 w-3" /> CRM
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Save Contact Details"}
          </h4>
          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Field:</span>
              <span className="font-semibold uppercase text-emerald-600 dark:text-emerald-400">{targetField}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Value:</span>
              <span className="font-mono font-medium truncate max-w-[100px]">{valueToSave}</span>
            </div>
          </div>
          {tag && (
            <div className="flex items-center text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/40 gap-1">
              <Tag className="h-3 w-3 shrink-0" />
              <span className="truncate font-semibold">Tag: {tag}</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default SaveContactNode;
