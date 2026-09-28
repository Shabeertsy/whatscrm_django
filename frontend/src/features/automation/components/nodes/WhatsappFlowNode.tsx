import React from "react";
import { MessageCircle, Smartphone } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface WhatsappFlowNodeProps {
  data: {
    title: string;
    description?: string;
    flowId?: string;
    ctaLabel?: string;
  };
  selected?: boolean;
}

export function WhatsappFlowNode({ data, selected }: WhatsappFlowNodeProps) {
  const ctaLabel = data.ctaLabel || "Open Form";

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #14b8a6" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #0d9488",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-teal-500 dark:border-teal-400 shadow-lg shadow-teal-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-teal-50 dark:bg-teal-950/40 px-3 py-2 border-b border-teal-100 dark:border-teal-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
              WhatsApp Flow
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-teal-600 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-0.5 shrink-0">
            <Smartphone className="h-3 w-3" /> FORM
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "WhatsApp Flow"}
          </h4>
          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Flow ID:</span>
              <span className="font-mono font-medium text-teal-600 dark:text-teal-400 truncate max-w-[80px]">
                {data.flowId ? data.flowId.substring(0, 8) + "..." : "Not set"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Button:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[80px]">
                {ctaLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default WhatsappFlowNode;
