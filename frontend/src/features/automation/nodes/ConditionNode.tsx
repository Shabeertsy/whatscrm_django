import React from "react";
import { Sliders } from "lucide-react";
import { Handle, Position } from "@xyflow/react";

interface ConditionNodeProps {
  data: {
    title: string;
    description: string;
  };
}

export function ConditionNode({ data }: ConditionNodeProps) {
  return (
    <div className="w-64 bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#2a364d] rounded-xl overflow-hidden shadow-lg relative pb-2 transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-[#f59e0b] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -ml-1.5" />
      <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center space-x-2 transition-colors">
        <Sliders className="h-4 w-4 text-[#f59e0b]" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Condition Split</span>
      </div>
      <div className="p-3 mb-6">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{data.title || "Condition"}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{data.description}</p>
      </div>

      {/* Two source handles for True / False paths on the right edge */}
      <div className="absolute right-0 bottom-8 flex flex-col items-end pr-2 gap-4">
        <div className="flex items-center space-x-1">
          <span className="text-[9px] text-[#10b981] font-bold">Yes</span>
          <Handle type="source" position={Position.Right} id="true" className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] !relative !right-auto !transform-none" />
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[9px] text-[#f43f5e] font-bold">No</span>
          <Handle type="source" position={Position.Right} id="false" className="!bg-[#f43f5e] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] !relative !right-auto !transform-none" />
        </div>
      </div>
    </div>
  );
}

export default ConditionNode;
