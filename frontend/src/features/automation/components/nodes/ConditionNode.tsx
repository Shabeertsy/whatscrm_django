import React from "react";
import { Sliders } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface ConditionNodeProps {
  data: { title: string; description: string; conditions?: any[] };
  selected?: boolean;
}

export function ConditionNode({ data, selected }: ConditionNodeProps) {
  const conditionsCount = Array.isArray(data.conditions) ? data.conditions.length : 0;

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #fbbf24" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #d97706",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Condition</span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Condition"}
          </h4>
          {conditionsCount > 0 && (
            <div className="inline-block px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded">
              {conditionsCount} {conditionsCount === 1 ? "Rule" : "Rules"}
            </div>
          )}
        </div>

        {/* Yes/No labels inside the card near the right edge */}
        <div className="absolute right-2 bottom-2 flex flex-col items-end gap-3">
          <span className="text-[9px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded">Yes</span>
          <span className="text-[9px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-1 rounded">No</span>
        </div>
      </div>

      {/* Handles outside so they aren't clipped */}
      <Handle type="target" position={Position.Left}
        className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right} id="true"
        style={{ top: "35%" }}
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right} id="false"
        style={{ top: "65%" }}
        className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default ConditionNode;
