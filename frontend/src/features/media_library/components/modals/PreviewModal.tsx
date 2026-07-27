import React from "react";
import { X, Copy, ExternalLink, Music, FileText } from "lucide-react";
import type { MediaLibraryItem } from "../../../../api/messaging";
import { formatFileSize } from "../../utils";

interface Props {
  item: MediaLibraryItem | null;
  onClose: () => void;
  onCopy: (url: string, id: string) => void;
}

/**
 * Lightbox / preview modal — shows image, plays video/audio, or offers a
 * download link for documents.
 */
export function PreviewModal({ item, onClose, onCopy }: Props) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="font-extrabold text-base text-slate-900 dark:text-white truncate">
              {item.name}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
              {item.media_type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-4 min-h-[300px]">
          {item.media_type === "image" && (
            <img
              src={item.file_url}
              alt={item.name}
              className="max-h-[60vh] max-w-full object-contain rounded-lg"
            />
          )}
          {item.media_type === "video" && (
            <video
              src={item.file_url}
              controls
              autoPlay
              className="max-h-[60vh] max-w-full rounded-lg"
            />
          )}
          {item.media_type === "audio" && (
            <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl flex flex-col items-center justify-center space-y-4">
              <Music className="h-16 w-16 text-purple-400 animate-pulse" />
              <audio src={item.file_url} controls className="w-full" />
            </div>
          )}
          {item.media_type === "document" && (
            <div className="text-center p-8 text-white space-y-4">
              <FileText className="h-20 w-20 text-amber-400 mx-auto" />
              <p className="text-sm font-medium">
                Document preview is not available in browser.
              </p>
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#007e3a] hover:bg-[#00602d] text-white rounded-xl font-bold text-sm transition"
              >
                <ExternalLink className="h-4 w-4" />
                Download / Open Document
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Size: {formatFileSize(item.file_size)}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onCopy(item.file_url, item.id)}
              className="flex items-center gap-1 text-[#007e3a] hover:underline"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </button>
            <a
              href={item.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-500 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Direct Link
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
