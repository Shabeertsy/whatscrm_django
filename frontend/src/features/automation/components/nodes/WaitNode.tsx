import React from "react";
import { Clock } from "lucide-react";
import { Handle, Position } from "@xyflow/react";

interface WaitNodeProps {
  data: {
    title: string;
    description: string;
  };
  selected?: boolean;
}

export function WaitNode({ data, selected }: WaitNodeProps) {
  return (
    <div className={`w-60 bg-white dark:bg-[#131924] rounded-xl overflow-hidden transition-all duration-150 ${
      selected
        ? "border-2 border-[#007e3a] dark:border-emerald-500 shadow-lg shadow-[#007e3a]/10"
        : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-[#3b82f6] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -ml-1.5" />
      <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center space-x-2 transition-colors">
        <Clock className="h-4 w-4 text-[#3b82f6]" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Delay</span>
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-[13px] text-slate-900 dark:text-white mb-1">{data.title || "Wait"}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{data.description}</p>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#3b82f6] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -mr-1.5" />
    </div>
  );
}

export default WaitNode;
