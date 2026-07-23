import React from "react";
import { Zap } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface TriggerNodeProps {
  data: { title: string; description: string; triggerType?: string };
  selected?: boolean;
}

export function TriggerNode({ data, selected }: TriggerNodeProps) {
  const triggerLabel = data.triggerType
    ? data.triggerType.replace(/_/g, " ").toUpperCase()
    : "START";

  return (
    /* Outer shell — NO overflow-hidden so resize handles aren't clipped */
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={60}
        lineStyle={{ border: "1.5px dashed #a78bfa" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #7c3aed",
        }}
      />

      {/* Inner visual card — overflow-hidden clips content to node bounds */}
      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-purple-50 dark:bg-purple-950/40 px-3 py-2 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 fill-purple-600 dark:fill-purple-400 shrink-0" />
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Trigger
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded shrink-0">
            {triggerLabel}
          </span>
        </div>
        <div className="p-2.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Start Trigger"}
          </h4>
        </div>
      </div>

      {/* Handles sit OUTSIDE the inner card so they're always visible */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-600 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]"
      />
    </div>
  );
}

export default TriggerNode;
