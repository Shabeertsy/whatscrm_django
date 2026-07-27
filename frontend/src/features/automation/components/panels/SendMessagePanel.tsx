import React, { useState } from "react";
import { FieldGroup, FieldTextarea } from "../ui/FormFields";
import { MediaSelectorModal } from "../modals/MediaSelectorModal";
import { FolderOpen, X, Image as ImageIcon, Film, FileText, Music, Link as LinkIcon } from "lucide-react";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function SendMessagePanel({ nodeId, data, update }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mediaType = (data.mediaType as string) || "";
  const mediaUrl = data.mediaUrl as string | undefined;
  const mediaName = data.mediaName as string | undefined;

  const handleClearMedia = () => {
    update(nodeId, {
      mediaUrl: null,
      mediaName: null,
      mediaType: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Message Content */}
      <FieldGroup label="Message Text">
        <FieldTextarea
          value={(data.message as string) || ""}
          onChange={(e) => update(nodeId, { message: e.target.value })}
          placeholder="Enter message to send to user..."
          rows={3}
          focus="focusGreen"
        />
      </FieldGroup>

      {/* Media Attachment Section */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Media Attachment (Optional)
          </label>
          {mediaUrl && (
            <button
              type="button"
              onClick={handleClearMedia}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
            >
              Remove Media
            </button>
          )}
        </div>

        {mediaUrl ? (
          /* Attached Media Card */
          <div className="bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 space-y-2 relative group">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                {mediaType === "image" && <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />}
                {mediaType === "video" && <Film className="h-4 w-4 text-blue-500 shrink-0" />}
                {mediaType === "audio" && <Music className="h-4 w-4 text-purple-500 shrink-0" />}
                {mediaType === "document" && <FileText className="h-4 w-4 text-amber-500 shrink-0" />}
                {!mediaType && <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />}
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {mediaName || "Attached File"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearMedia}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                title="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {mediaType === "image" && (
              <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 h-28 bg-slate-100 dark:bg-slate-800">
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full text-center py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              Change File
            </button>
          </div>
        ) : (
          /* Select Media Button */
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all shadow-2xs"
          >
            <FolderOpen className="h-4 w-4 text-[#007e3a]" />
            <span>Select Media from Library</span>
          </button>
        )}

        <MediaSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelect={(item) => {
            update(nodeId, {
              mediaUrl: item.file_url,
              mediaName: item.name,
              mediaType: item.media_type,
            });
          }}
        />
      </div>
    </div>
  );
}


