import React from "react";
import { MapPin, UserCheck } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";


interface SaveLocationNodeProps {
  data: {
    title: string;
    description?: string;
    locationId?: string;
    locationName?: string;
  };
  selected?: boolean;
}


export function SaveLocationNode({ data, selected }: SaveLocationNodeProps) {
  const locationName = data.locationName || "None selected";

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #f43f5e" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #e11d48",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${selected
          ? "border-2 border-rose-500 dark:border-rose-400 shadow-lg shadow-rose-500/20"
          : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
          }`}
      >
        <div className="bg-rose-50 dark:bg-rose-950/40 px-3 py-2 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              Save Location
            </span>
          </div>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Save Chat Location"}
          </h4>
          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Location:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 truncate max-w-[120px]">{locationName}</span>
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default SaveLocationNode;
