import React from "react";
import { XCircle } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface EndChatNodeProps {
  data: { title: string; description?: string; message?: string; closingMessage?: string };
  selected?: boolean;
}

export function EndChatNode({ data, selected }: EndChatNodeProps) {
  const closeMessage = data.closingMessage || data.message;

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={60}
        lineStyle={{ border: "1.5px dashed #fb7185" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #e11d48",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-rose-500 dark:border-rose-400 shadow-lg shadow-rose-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-rose-50 dark:bg-rose-950/40 px-3 py-2 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              End Chat
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50 px-1.5 py-0.5 rounded shrink-0">
            TERMINAL
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "End Chat"}
          </h4>
          {closeMessage && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-3">
              {closeMessage}
            </p>
          )}
        </div>
      </div>

      {/* Terminal: only target, no source */}
      <Handle type="target" position={Position.Left}
        className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default EndChatNode;
