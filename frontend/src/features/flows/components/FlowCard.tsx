import React from "react";
import { Globe, Trash2, BarChart2, Loader2 } from "lucide-react";



export function FlowCard({ 
  flow, isPublishing, isDeleting, onDelete, onPublish, onClick 
}: { 
  flow: any; 
  isPublishing?: boolean; 
  isDeleting?: boolean; 
  onDelete: (e: React.MouseEvent) => void; 
  onPublish: (e: React.MouseEvent) => void; 
  onClick: () => void 
}) {
  const isPublished = flow.status === "PUBLISHED";
  return (
    <div onClick={onClick} className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-[#007e3a]/50 transition-all cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">{flow.name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {flow.category?.replace(/_/g, " ")}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${isPublished ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isPublished && (
            <button disabled={isPublishing} onClick={onPublish} title="Publish to Meta" className="p-1.5 text-slate-400 hover:text-[#007e3a] transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" /> : <Globe className="h-4 w-4" />}
            </button>
          )}
          <button disabled={isDeleting} onClick={onDelete} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-rose-500" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <BarChart2 className="w-3.5 h-3.5 text-[#007e3a]" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{flow.submission_count ?? 0}</span> submissions
        </div>
        <span className="text-slate-400">{new Date(flow.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
