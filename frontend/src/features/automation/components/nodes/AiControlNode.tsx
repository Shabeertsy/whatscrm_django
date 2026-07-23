import React from "react";
import { Sparkles, Bot } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface AiControlNodeProps {
  data: {
    title: string;
    description?: string;
    aiAction?: string;
    agentPersona?: string;
    systemInstructions?: string;
  };
  selected?: boolean;
}

export function AiControlNode({ data, selected }: AiControlNodeProps) {
  const actionLabel = data.aiAction === "disable_ai" ? "Pause AI Agent" : "Handover to AI";

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={60}
        lineStyle={{ border: "1.5px dashed #818cf8" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #4f46e5",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              AI Control
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-0.5 shrink-0">
            <Bot className="h-3 w-3" /> AI
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "AI Agent Control"}
          </h4>
          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Action:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{actionLabel}</span>
            </div>
          </div>
          {data.systemInstructions && (
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight italic line-clamp-2 bg-indigo-50/50 dark:bg-indigo-950/30 p-1 rounded border border-indigo-100/50 dark:border-indigo-900/30">
              "{data.systemInstructions}"
            </p>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default AiControlNode;
