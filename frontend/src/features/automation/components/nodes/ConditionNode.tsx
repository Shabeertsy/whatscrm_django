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
    <div className="w-full h-full relative" style={{ minWidth: 240, minHeight: 150 + (conditionsCount * 36) }}>
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        maxWidth={480}
        minHeight={150 + (conditionsCount * 36)}
        lineStyle={{ border: "1.5px dashed #fbbf24" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #d97706",
        }}
      />

      <div
        className={`w-full h-full flex flex-col rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${selected
          ? "border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20"
          : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
          }`}
      >
        <div className="bg-slate-50 dark:bg-[#1C2333] rounded-t-xl px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Condition Split</span>
        </div>

        <div className="p-3 flex-1 flex flex-col">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight mb-2 truncate">
            {data.title || "Condition"}
          </h4>

          {/* Branches */}
          <div className="flex-1 flex flex-col justify-center gap-3">
            {Array.from({ length: conditionsCount }).map((_, i) => (
              <div key={i} className="flex justify-between items-center relative">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Condition {i + 1}</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                  Rule #{i + 1}
                </span>
                {/* Handle for this rule */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`cond_${i}`}
                  className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924] !-right-4"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            ))}

            {/* Else Branch */}
            <div className="flex justify-between items-center relative pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Fallback</span>
              <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">
                Else
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="fallback"
                className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924] !-right-4"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default ConditionNode;
