import React from "react";
import { Link as LinkIcon, X } from "lucide-react";
import type { UrlFormData } from "../../hooks/useMediaLibrary";

interface Props {
  isOpen: boolean;
  formData: UrlFormData;
  onChange: (data: UrlFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/**
 * Modal for adding an external media URL to the library.
 */
export function AddUrlModal({ isOpen, formData, onChange, onSubmit, onClose }: Props) {
  if (!isOpen) return null;

  const field = (key: keyof UrlFormData) => (value: string) =>
    onChange({ ...formData, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#007e3a]/10 text-[#007e3a] rounded-xl">
              <LinkIcon className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              Add External URL
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Media Name / Title
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => field("name")(e.target.value)}
              placeholder="e.g. Summer Promo Image"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Direct File URL
            </label>
            <input
              type="url"
              required
              value={formData.file_url}
              onChange={(e) => field("file_url")(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Media Type
            </label>
            <select
              value={formData.media_type}
              onChange={(e) => field("media_type")(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-all font-medium"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document">Document</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#007e3a] hover:bg-[#00602d] text-white rounded-xl text-sm font-bold shadow-md transition transform hover:-translate-y-0.5"
            >
              Save to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
