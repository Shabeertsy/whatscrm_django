import React from "react";
import { Building2, ArrowRightLeft } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";



interface SendListingNodeProps {
  data: {
    title?: string;
    apiUrl?: string;
    maxResults?: number;
    nextLabel?: string;
    bookLabel?: string;
    exitLabel?: string;
  };
  selected?: boolean;
}



export function SendListingNode({ data, selected }: SendListingNodeProps) {
  const apiUrl = data.apiUrl || "";
  const maxResults = data.maxResults ?? 5;

  // Show just the hostname so the card doesn't overflow
  const urlPreview = (() => {
    try { return new URL(apiUrl).hostname || apiUrl; }
    catch { return apiUrl || "No URL set"; }
  })();

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #f59e0b" }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "#fff", border: "2px solid #d97706" }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${selected
          ? "border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20"
          : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
          }`}
      >
        {/* Header */}
        <div className="bg-amber-50 dark:bg-amber-950/40 px-3 py-2 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Send Listing
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-0.5 shrink-0">
            <ArrowRightLeft className="h-3 w-3" /> PAGINATE
          </span>
        </div>

        {/* Body */}
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Send Listing"}
          </h4>

          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">API:</span>
              <span className="font-mono font-medium text-amber-600 dark:text-amber-400 truncate max-w-[100px]">
                {urlPreview}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Max:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {maxResults} results
              </span>
            </div>
          </div>

          {/* Pagination button previews */}
          <div className="flex gap-1 pt-0.5">
            {[data.nextLabel || "Next", data.bookLabel || "Book", data.exitLabel || "Exit"].map((lbl) => (
              <span
                key={lbl}
                className="flex-1 text-center text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded px-1 py-0.5 truncate"
              >
                {lbl}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      
      {/* Book Handle */}
      <Handle type="source" id="book" position={Position.Right} style={{ top: '65%' }}
        className="group !bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924] hover:!w-3 hover:!h-3 transition-all cursor-crosshair"
      >
        <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold uppercase rounded border border-amber-200 dark:border-amber-700/50 shadow-sm pointer-events-none whitespace-nowrap z-50">
          Book
        </div>
      </Handle>
        
      {/* Exit Handle */}
      <Handle type="source" id="exit" position={Position.Right} style={{ top: '85%' }}
        className="group !bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924] hover:!w-3 hover:!h-3 transition-all cursor-crosshair"
      >
        <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-extrabold uppercase rounded border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none whitespace-nowrap z-50">
          Exit
        </div>
      </Handle>
    </div>
  );
}

export default SendListingNode;
