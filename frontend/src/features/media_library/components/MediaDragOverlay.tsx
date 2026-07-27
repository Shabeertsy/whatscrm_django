import React from "react";
import { Upload } from "lucide-react";

interface Props {
  isDragging: boolean;
}

/**
 * Full-screen drag-and-drop overlay shown when a user drags files over the page.
 */
export function MediaDragOverlay({ isDragging }: Props) {
  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#007e3a]/10 backdrop-blur-sm border-4 border-dashed border-[#007e3a] rounded-3xl flex flex-col items-center justify-center p-8 transition-all animate-pulse pointer-events-none">
      <div className="w-24 h-24 bg-[#007e3a] text-white rounded-full flex items-center justify-center shadow-2xl mb-4">
        <Upload className="h-12 w-12" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Drop files here to upload to Media Library
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 font-medium">
        Supports Images, Videos, Audio, and Documents
      </p>
    </div>
  );
}
