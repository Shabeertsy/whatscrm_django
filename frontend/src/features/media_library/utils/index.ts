import { Image as ImageIcon, Film, FileText, Music, FolderOpen } from "lucide-react";
import type { MediaLibraryItem } from "../../../api/messaging";


// ─── File Size ─────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "External";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}


// ─── Media Type Detection ────────────────────────
export function isImageType(item: MediaLibraryItem): boolean {
  return (
    item.media_type === "image" ||
    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(item.file_url || item.name || "")
  );
}


export function getMediaTypeLabel(item: MediaLibraryItem): string {
  return isImageType(item) ? "image" : item.media_type;
}


// ─── Tab Definitions ───────────────────────────────
export const MEDIA_TABS = [
  { id: "all", label: "All Media", Icon: FolderOpen },
  { id: "image", label: "Images", Icon: ImageIcon },
  { id: "video", label: "Videos", Icon: Film },
  { id: "document", label: "Documents", Icon: FileText },
  { id: "audio", label: "Audio", Icon: Music },
] as const;

export type MediaTab = typeof MEDIA_TABS[number]["id"];
