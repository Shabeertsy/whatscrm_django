import React from "react";
import { Globe, Code2 } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface HttpRequestNodeProps {
  data: {
    title: string;
    description?: string;
    httpMethod?: string;
    url?: string;
    requestBody?: string;
    responseVariable?: string;
  };
  selected?: boolean;
}

export function HttpRequestNode({ data, selected }: HttpRequestNodeProps) {
  const method = (data.httpMethod || "POST").toUpperCase();
  const urlText = data.url || "https://api.example.com/webhook";
  const variable = data.responseVariable;

  const methodColorClass =
    method === "GET"    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" :
    method === "POST"   ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
    method === "DELETE" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";

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
        <div className="bg-amber-50 dark:bg-amber-950/40 px-3 py-2 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              HTTP Request
            </span>
          </div>
          <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded shrink-0 ${methodColorClass}`}>
            {method}
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "HTTP Webhook Request"}
          </h4>
          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[9px] font-mono truncate text-slate-600 dark:text-slate-300">
            {urlText}
          </div>
          {variable && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px]">
              <span className="text-slate-400 font-medium flex items-center gap-0.5">
                <Code2 className="h-3 w-3 text-amber-500" /> Response:
              </span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded">
                {`{{${variable}}}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default HttpRequestNode;
