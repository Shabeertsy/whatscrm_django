import React from "react";
import { FileInput, Variable } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface CollectInputNodeProps {
  data: {
    title: string;
    description?: string;
    prompt?: string;
    message?: string;
    variableName?: string;
    validationType?: string;
    errorMessage?: string;
  };
  selected?: boolean;
}

export function CollectInputNode({ data, selected }: CollectInputNodeProps) {
  const promptText = data.prompt || data.message || "Ask for user input...";
  const variable = data.variableName;
  const inputType = data.validationType || "text";

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #c084fc" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #9333ea",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-purple-50 dark:bg-purple-950/40 px-3 py-2 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileInput className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Collect Input
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded font-mono uppercase shrink-0">
            {inputType}
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Collect Input"}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-2">
            {promptText}
          </p>
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px]">
            <span className="text-slate-400 font-medium flex items-center gap-0.5">
              <Variable className="h-3 w-3 text-purple-500" /> Save to:
            </span>
            <span className="font-mono font-semibold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-1 py-0.5 rounded">
              {variable ? `{{${variable}}}` : "Not saved"}
            </span>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-purple-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-purple-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default CollectInputNode;
