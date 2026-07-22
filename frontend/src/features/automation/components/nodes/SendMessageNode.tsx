import React from "react";
import { MessageSquare, Film, FileText, Image as ImageIcon } from "lucide-react";
import { Handle, Position } from "@xyflow/react";

interface SendMessageNodeProps {
  data: {
    title: string;
    description: string;
    mediaUrl?: string;
    mediaName?: string;
    mediaType?: string;
  };
  selected?: boolean;
}

export function SendMessageNode({ data, selected }: SendMessageNodeProps) {
  const isMediaNode = !!data.mediaUrl || (data.title as string)?.toLowerCase().includes("media");

  return (
    <div className={`w-60 bg-white dark:bg-[#131924] rounded-xl overflow-hidden transition-all duration-150 ${
      selected
        ? "border-2 border-[#007e3a] dark:border-emerald-500 shadow-lg shadow-[#007e3a]/10"
        : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -ml-1.5" />
      <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center space-x-2 transition-colors">
        {isMediaNode ? <ImageIcon className="h-4 w-4 text-pink-500" /> : <MessageSquare className="h-4 w-4 text-[#10b981]" />}
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {isMediaNode ? "Send Media" : "Send Message"}
        </span>
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-[13px] text-slate-900 dark:text-white mb-1">{data.title || "Message"}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{data.description}</p>

        {data.mediaUrl && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {data.mediaType === "image" ? (
              <img src={data.mediaUrl} alt="" className="h-24 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {data.mediaType === "video" ? <Film className="h-4 w-4 text-blue-500 shrink-0" /> : <FileText className="h-4 w-4 text-amber-500 shrink-0" />}
                <span className="truncate font-medium">{data.mediaName || "Attached File"}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -mr-1.5" />
    </div>
  );
}

export default SendMessageNode;
