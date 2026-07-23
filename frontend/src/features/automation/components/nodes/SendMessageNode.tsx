import React from "react";
import { MessageSquare, Film, FileText, Image as ImageIcon } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface SendMessageNodeProps {
  data: {
    title: string;
    description?: string;
    message?: string;
    mediaUrl?: string;
    mediaName?: string;
    mediaType?: string;
  };
  selected?: boolean;
}

export function SendMessageNode({ data, selected }: SendMessageNodeProps) {
  const isMediaNode = !!data.mediaUrl || (data.title as string)?.toLowerCase().includes("media");

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={60}
        lineStyle={{ border: "1.5px dashed #34d399" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #059669",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-emerald-500 dark:border-emerald-400 shadow-lg shadow-emerald-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center gap-2">
          {isMediaNode
            ? <ImageIcon className="h-3.5 w-3.5 text-pink-500 shrink-0" />
            : <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            {isMediaNode ? "Send Media" : "Send Message"}
          </span>
        </div>
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Message"}
          </h4>
          {data.message && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-3">
              {data.message}
            </p>
          )}
          {data.mediaUrl && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
              {data.mediaType === "image" ? (
                <img src={data.mediaUrl} alt="" className="h-16 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {data.mediaType === "video"
                    ? <Film className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    : <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  <span className="truncate font-medium">{data.mediaName || "Attached File"}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
      <Handle type="source" position={Position.Right}
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default SendMessageNode;
