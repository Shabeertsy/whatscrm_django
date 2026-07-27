import React from "react";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { useMediaLibrary } from "./hooks/useMediaLibrary";
import { MediaDragOverlay } from "./components/MediaDragOverlay";
import { MediaHeader } from "./components/MediaHeader";
import { MediaToolbar } from "./components/MediaToolbar";
import { MediaGrid } from "./components/MediaGrid";
import { AddUrlModal } from "./components/modals/AddUrlModal";
import { PreviewModal } from "./components/modals/PreviewModal";


export function MediaLibrary() {
  const media = useMediaLibrary();

  return (
    <div
      className="space-y-6 relative min-h-screen"
      onDragOver={(e) => { e.preventDefault(); media.setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) media.setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        media.setIsDragging(false);
        media.handleFileUpload(e.dataTransfer.files);
      }}
    >
      {/* Drag-and-drop overlay */}
      <MediaDragOverlay isDragging={media.isDragging} />

      {/* Page header + upload actions */}
      <MediaHeader
        itemCount={media.items.length}
        totalBytes={media.totalBytes}
        isUploading={media.isUploading}
        fileInputRef={media.fileInputRef}
        onUploadClick={() => media.fileInputRef.current?.click()}
        onFileChange={media.handleFileUpload}
        onAddUrlClick={() => media.setIsUrlModalOpen(true)}
      />

      {/* Tabs + search */}
      <MediaToolbar
        activeTab={media.activeTab}
        onTabChange={media.setActiveTab}
        searchQuery={media.searchQuery}
        onSearchChange={media.setSearchQuery}
        getCount={media.getCount}
      />

      {/* Grid / loading / empty state */}
      <MediaGrid
        items={media.filteredItems}
        loading={media.loading}
        searchQuery={media.searchQuery}
        copiedId={media.copiedId}
        onPreview={media.setPreviewItem}
        onCopy={media.copyUrl}
        onDelete={media.setDeleteId}
        onUploadClick={() => media.fileInputRef.current?.click()}
      />

      {/* Modals */}
      <AddUrlModal
        isOpen={media.isUrlModalOpen}
        formData={media.urlFormData}
        onChange={media.setUrlFormData}
        onSubmit={media.handleAddUrl}
        onClose={() => media.setIsUrlModalOpen(false)}
      />

      <PreviewModal
        item={media.previewItem}
        onClose={() => media.setPreviewItem(null)}
        onCopy={media.copyUrl}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={Boolean(media.deleteId)}
        title="Delete Media Item"
        description="Are you sure you want to delete this file from your Media Library? Any automations referencing this URL will no longer be able to send this file."
        confirmLabel="Delete File"
        isLoading={media.isDeleting}
        onConfirm={media.handleDelete}
        onCancel={() => media.setDeleteId(null)}
      />
    </div>
  );
}

export default MediaLibrary;
