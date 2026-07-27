import { useState, useEffect, useRef } from "react";
import { messagingApi, MediaLibraryItem } from "../../../api/messaging";
import { showToast } from "../../../utils/toast";
import type { MediaTab } from "../utils";

// ─── URL Form State Type ──────────────────────────────────────────────────────

export interface UrlFormData {
  name: string;
  file_url: string;
  media_type: "image" | "video" | "audio" | "document";
}

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseMediaLibraryReturn {
  // Data
  items: MediaLibraryItem[];
  filteredItems: MediaLibraryItem[];
  loading: boolean;
  totalBytes: number;

  // UI State
  activeTab: MediaTab;
  setActiveTab: (tab: MediaTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isUploading: boolean;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  copiedId: string | null;

  // Preview & Delete
  previewItem: MediaLibraryItem | null;
  setPreviewItem: (item: MediaLibraryItem | null) => void;
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  isDeleting: boolean;

  // URL Modal
  isUrlModalOpen: boolean;
  setIsUrlModalOpen: (v: boolean) => void;
  urlFormData: UrlFormData;
  setUrlFormData: (data: UrlFormData) => void;

  // Ref
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Actions
  fetchMedia: () => Promise<void>;
  handleFileUpload: (files: FileList | null) => Promise<void>;
  handleAddUrl: (e: React.FormEvent) => Promise<void>;
  handleDelete: () => Promise<void>;
  copyUrl: (url: string, id: string) => void;
  getCount: (type: string) => number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMediaLibrary(): UseMediaLibraryReturn {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MediaTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<MediaLibraryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlFormData, setUrlFormData] = useState<UrlFormData>({
    name: "",
    file_url: "",
    media_type: "image",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await messagingApi.listMediaLibrary();
      setItems(res.data || []);
    } catch (e: any) {
      console.error(e);
      showToast(
        "Error",
        e?.response?.data?.detail || e?.message || "Failed to load media library",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Upload ─────────────────────────────────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let mediaType = "document";
        if (file.type.startsWith("image/")) mediaType = "image";
        else if (file.type.startsWith("video/")) mediaType = "video";
        else if (file.type.startsWith("audio/")) mediaType = "audio";

        await messagingApi.uploadToMediaLibrary(file, file.name, mediaType);
        successCount++;
      } catch (e: any) {
        console.error(e);
        showToast(
          "Upload Error",
          `Failed to upload ${file.name}: ${e?.response?.data?.detail || e?.message}`,
          "error"
        );
      }
    }

    if (successCount > 0) {
      showToast("Success", `Successfully uploaded ${successCount} file(s)`, "success");
      fetchMedia();
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Add External URL ───────────────────────────────────────────────────────

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlFormData.name || !urlFormData.file_url) {
      showToast("Warning", "Please fill in all fields", "error");
      return;
    }
    try {
      await messagingApi.createMediaItem(urlFormData);
      showToast("Success", "External URL added to library", "success");
      setIsUrlModalOpen(false);
      setUrlFormData({ name: "", file_url: "", media_type: "image" });
      fetchMedia();
    } catch (e: any) {
      console.error(e);
      showToast(
        "Error",
        e?.response?.data?.detail || e?.message || "Failed to add URL",
        "error"
      );
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await messagingApi.deleteMediaItem(deleteId);
      showToast("Success", "Media item removed", "success");
      setItems((prev) => prev.filter((item) => item.id !== deleteId));
      setDeleteId(null);
    } catch (e: any) {
      console.error(e);
      showToast("Error", "Failed to delete item", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Copy URL ───────────────────────────────────────────────────────────────

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast("Copied!", "Media URL copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Computed ───────────────────────────────────────────────────────────────

  const totalBytes = items.reduce((sum, item) => sum + (item.file_size || 0), 0);

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "all" || item.media_type === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getCount = (type: string) => {
    if (type === "all") return items.length;
    return items.filter((item) => item.media_type === type).length;
  };

  return {
    items,
    filteredItems,
    loading,
    totalBytes,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isUploading,
    isDragging,
    setIsDragging,
    copiedId,
    previewItem,
    setPreviewItem,
    deleteId,
    setDeleteId,
    isDeleting,
    isUrlModalOpen,
    setIsUrlModalOpen,
    urlFormData,
    setUrlFormData,
    fileInputRef,
    fetchMedia,
    handleFileUpload,
    handleAddUrl,
    handleDelete,
    copyUrl,
    getCount,
  };
}
