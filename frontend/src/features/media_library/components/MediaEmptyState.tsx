import React from "react";
import { Upload, FolderOpen } from "lucide-react";

interface Props {
  searchQuery: string;
  onUploadClick: () => void;
}

/**
 * Shown when the filtered media list is empty — either no files or no search results.
 */
export function MediaEmptyState({ searchQuery, onUploadClick }: Props) {
  return (
    <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm transition-all text-center p-6">
      <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-[#007e3a] mb-6 shadow-sm border border-emerald-200/60 dark:border-emerald-800/50">
        <FolderOpen className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
        {searchQuery ? "No matching media found" : "Your Media Library is empty"}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md leading-relaxed">
        {searchQuery
          ? "Try adjusting your search keywords or switching tab filters."
          : "Upload images, videos, audio clips, or PDF documents to quickly attach them inside your automation workflows."}
      </p>
      {!searchQuery && (
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-[#007e3a] hover:bg-[#00602d] text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Upload className="h-5 w-5" />
          <span>Upload your first file</span>
        </button>
      )}
    </div>
  );
}
