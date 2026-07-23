import React from "react";
import { Clock } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface WaitNodeProps {
  data: { title: string; description: string; delayValue?: number | string; delayUnit?: string };
  selected?: boolean;
}

export function WaitNode({ data, selected }: WaitNodeProps) {
  const durationText = data.delayValue
    ? `${data.delayValue} ${data.delayUnit || "mins"}`
    : null;

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={60}
        lineStyle={{ border: "1.5px dashed #60a5fa" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #2563eb",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Delay</span>
          </div>
          {durationText && (
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded shrink-0">
              {durationText}
            </span>
          )}
        </div>
        <div className="p-2.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Delay"}
          </h4>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default WaitNode;
