import React from "react";
import { MessageSquare } from "lucide-react";
import { Handle, Position } from "@xyflow/react";

interface SendMessageNodeProps {
  data: {
    title: string;
    description: string;
  };
}

export function SendMessageNode({ data }: SendMessageNodeProps) {
  return (
    <div className="w-64 bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#2a364d] rounded-xl overflow-hidden shadow-lg transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -ml-1.5" />
      <div className="bg-slate-50 dark:bg-[#1C2333] px-3 py-2 border-b border-slate-200 dark:border-[#2a364d] flex items-center space-x-2 transition-colors">
        <MessageSquare className="h-4 w-4 text-[#10b981]" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Send Message</span>
      </div>
      <div className="p-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{data.title || "Message"}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{data.description}</p>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-white dark:!border-[#131924] -mr-1.5" />
    </div>
  );
}

export default SendMessageNode;
