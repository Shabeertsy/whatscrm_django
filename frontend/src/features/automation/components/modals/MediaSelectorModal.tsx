import React, { useEffect, useState, useRef } from "react";
import { messagingApi, MediaLibraryItem } from "../../../../api/messaging";
import { showToast } from "../../../../utils/toast";
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Film,
  FileText,
  Music,
  FolderOpen,
  Check,
  HardDrive
} from "lucide-react";

interface MediaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MediaLibraryItem) => void;
  initialFilter?: string;
}

export function MediaSelectorModal({
  isOpen,
  onClose,
  onSelect,
  initialFilter = "all",
}: MediaSelectorModalProps) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(initialFilter || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialFilter && initialFilter !== "all") {
        setActiveTab(initialFilter);
      }
      fetchMedia();
    }
  }, [isOpen, initialFilter]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await messagingApi.listMediaLibrary();
      setItems(res.data || []);
    } catch (e: any) {
      console.error(e);
      showToast("Error", "Failed to load media library items", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const file = files[0];
    try {
      let mediaType = "document";
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("video/")) mediaType = "video";
      else if (file.type.startsWith("audio/")) mediaType = "audio";

      const res = await messagingApi.uploadToMediaLibrary(file, file.name, mediaType);
      showToast("Success", `Uploaded ${file.name}`, "success");
      const newItem = res.data;
      if (newItem) {
        setItems((prev) => [newItem, ...prev]);
        onSelect(newItem);
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      showToast("Upload Error", e?.response?.data?.detail || e?.message || "Upload failed", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "External / Unknown";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "all" || item.media_type === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-l border-r border-slate-200 dark:border-slate-800 max-w-2xl w-full p-5 sm:p-6 shadow-2xl flex flex-col h-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">

            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Select Media File
              </h3>

            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Pills + Search & Upload Bar */}
        <div className="space-y-3 mb-4 shrink-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: "All Files", icon: FolderOpen },
              { id: "image", label: "Images", icon: ImageIcon },
              { id: "video", label: "Videos", icon: Film },
              { id: "document", label: "Documents", icon: FileText },
              { id: "audio", label: "Audio", icon: Music },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = items.filter((i) => tab.id === "all" || i.media_type === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${isActive
                    ? "bg-[#007e3a] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/80"
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Upload Input Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name..."
                className="w-full bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* 
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-1.5 bg-[#007e3a] hover:bg-[#00602d] text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs disabled:opacity-50 shrink-0"
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Upload className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{isUploading ? "Uploading..." : "Upload New"}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              accept="image/*,video/*,audio/*,application/pdf"
              className="hidden"
            /> */}
          </div>
        </div>

        {/* Media File List */}
        <div className="flex-1 overflow-y-auto min-h-[260px] pr-1 space-y-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <div className="w-7 h-7 border-2 border-[#007e3a] border-t-transparent rounded-full animate-spin mb-2.5" />
              <p className="text-xs font-semibold text-slate-500">Loading files...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
              <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">No media files found</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                {searchQuery
                  ? "No files matched your search keywords."
                  : "Click 'Upload New' to add your first file to this library."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="group flex items-center justify-between p-2.5 bg-white hover:bg-emerald-50/50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/80 hover:border-[#007e3a]/60 dark:border-slate-800 dark:hover:border-[#007e3a]/60 rounded-2xl cursor-pointer transition-all duration-150 shadow-2xs hover:shadow-sm"
              >
                {/* File Thumbnail + Info */}
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  {/* Thumbnail Box */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                    {item.media_type === "image" && (
                      <img src={item.file_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                    {item.media_type === "video" && (
                      <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white">
                        <Film className="h-5 w-5" />
                      </div>
                    )}
                    {item.media_type === "audio" && (
                      <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white">
                        <Music className="h-5 w-5" />
                      </div>
                    )}
                    {item.media_type === "document" && (
                      <div className="w-full h-full bg-amber-500 flex items-center justify-center text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Name + Details */}
                  <div className="min-w-0">
                    <h5 title={item.name} className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#007e3a] dark:group-hover:text-emerald-400 truncate leading-snug transition-colors">
                      {item.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      <span className="capitalize font-bold text-[#007e3a] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded text-[10px]">
                        {item.media_type}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(item.file_size)}</span>
                    </div>
                  </div>
                </div>

                {/* Attach Action Button */}
                <div className="shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#007e3a] dark:text-emerald-300 group-hover:bg-[#007e3a] group-hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs border border-emerald-200/80 dark:border-emerald-800/60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Select</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">
          <span>Showing {filteredItems.length} of {items.length} files</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
export default MediaSelectorModal;
