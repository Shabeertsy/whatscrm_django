import React from "react";
import {
  Image as ImageIcon,
  Film,
  FileText,
  Music,
  Copy,
  Check,
  Trash2,
  Eye,
} from "lucide-react";
import type { MediaLibraryItem } from "../../../api/messaging";
import { formatFileSize, isImageType, getMediaTypeLabel } from "../utils";

interface Props {
  item: MediaLibraryItem;
  isCopied: boolean;
  onPreview: (item: MediaLibraryItem) => void;
  onCopy: (url: string, id: string) => void;
  onDelete: (id: string) => void;
}

/** Returns a color-coded icon for the media type badge */
function TypeBadgeIcon({ item }: { item: MediaLibraryItem }) {
  if (isImageType(item)) return <ImageIcon className="h-2.5 w-2.5 text-emerald-400" />;
  if (item.media_type === "video") return <Film className="h-2.5 w-2.5 text-blue-400" />;
  if (item.media_type === "audio") return <Music className="h-2.5 w-2.5 text-purple-400" />;
  return <FileText className="h-2.5 w-2.5 text-amber-400" />;
}

/** Icon shown in the dark preview area for non-image media */
function MediaTypeIcon({ item }: { item: MediaLibraryItem }) {
  if (item.media_type === "video") return <Film className="h-5 w-5 text-white" />;
  if (item.media_type === "audio") return <Music className="h-5 w-5 text-white" />;
  return <FileText className="h-5 w-5 text-white" />;
}

/** Background colour for the non-image icon pill */
const ICON_BG: Record<string, string> = {
  video: "bg-blue-600",
  audio: "bg-purple-600",
  document: "bg-amber-600",
};

/**
 * Single media grid card — preview thumbnail, type badge, filename, size, date,
 * copy URL and delete action buttons.
 */
export function MediaCard({ item, isCopied, onPreview, onCopy, onDelete }: Props) {
  const isImage = isImageType(item);
  const iconBg = ICON_BG[item.media_type] ?? "bg-slate-600";

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between h-[195px] relative">

      <div
        onClick={() => onPreview(item)}
        className="h-[120px] w-full bg-slate-100 dark:bg-slate-800/60 relative overflow-hidden cursor-pointer flex items-center justify-center group-hover:opacity-95 transition-opacity shrink-0"
      >
        {isImage ? (
          <img
            src={item.file_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center p-2">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
              <MediaTypeIcon item={item} />
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-xs flex items-center gap-1 pointer-events-none">
          <TypeBadgeIcon item={item} />
          <span>{getMediaTypeLabel(item)}</span>
        </div>

        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white shadow-md transform scale-90 group-hover:scale-100 transition-transform">
            <Eye className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <div className="p-2 flex-1 flex flex-col justify-between overflow-hidden">
        <div className="min-w-0">
          <h4
            title={item.name}
            className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight"
          >
            {item.name}
          </h4>
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
            <span>{formatFileSize(item.file_size)}</span>
            <span>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1.5 mt-auto">
          <button
            onClick={() => onCopy(item.file_url, item.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${isCopied
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            title="Copy URL"
          >
            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span className="truncate">{isCopied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={() => onDelete(item.id)}
            className="p-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 rounded-lg transition shrink-0"
            title="Delete Media"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
