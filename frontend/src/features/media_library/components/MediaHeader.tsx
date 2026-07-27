import React from "react";
import { Upload, Link as LinkIcon, FolderOpen, HardDrive } from "lucide-react";
import PageHeader from "../../../components/shared/PageHeader";
import { formatFileSize } from "../utils";

interface Props {
  itemCount: number;
  totalBytes: number;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadClick: () => void;
  onFileChange: (files: FileList | null) => void;
  onAddUrlClick: () => void;
}

/**
 * Top banner: page title, storage stats, Upload Media button, Add External URL button.
 */
export function MediaHeader({
  itemCount,
  totalBytes,
  isUploading,
  fileInputRef,
  onUploadClick,
  onFileChange,
  onAddUrlClick,
}: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#007e3a]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        {/* Left: title + stats */}
        <div className="flex-1 min-w-0 pr-2 md:pr-6">
          <PageHeader
            title="Media Library"
            description="Upload, organize, and select media files for your automation workflows and campaigns."
          />
          <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs whitespace-nowrap">
              <FolderOpen className="h-4 w-4 text-[#007e3a] shrink-0" />
              <span>{itemCount} Total Items</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs whitespace-nowrap">
              <HardDrive className="h-4 w-4 text-blue-500 shrink-0" />
              <span>{formatFileSize(totalBytes)} Storage Used</span>
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onAddUrlClick}
            className="inline-flex items-center justify-center gap-2 h-11 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 px-5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 shrink-0"
          >
            <LinkIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Add External URL</span>
          </button>

          <button
            type="button"
            onClick={onUploadClick}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 h-11 bg-[#007e3a] hover:bg-[#00602d] text-white px-6 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-md shadow-[#007e3a]/20 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none shrink-0"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Upload className="h-4 w-4 shrink-0" />
            )}
            <span>{isUploading ? "Uploading..." : "Upload Media"}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => onFileChange(e.target.files)}
            multiple
            accept="image/*,video/*,audio/*,application/pdf"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
