import React from "react";
import type { MediaLibraryItem } from "../../../api/messaging";
import { MediaCard } from "./MediaCard";
import { MediaEmptyState } from "./MediaEmptyState";

interface Props {
  items: MediaLibraryItem[];
  loading: boolean;
  searchQuery: string;
  copiedId: string | null;
  onPreview: (item: MediaLibraryItem) => void;
  onCopy: (url: string, id: string) => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
}

/**
 * Renders the responsive grid of MediaCards, or the loading spinner, or the empty state.
 */
export function MediaGrid({
  items,
  loading,
  searchQuery,
  copiedId,
  onPreview,
  onCopy,
  onDelete,
  onUploadClick,
}: Props) {
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-[#007e3a] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Loading media files...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <MediaEmptyState searchQuery={searchQuery} onUploadClick={onUploadClick} />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          isCopied={copiedId === item.id}
          onPreview={onPreview}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
