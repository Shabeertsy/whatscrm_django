import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center space-x-3 text-amber-500 mb-4">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
        </div>
        <p className="text-xs text-slate-505 text-slate-500 dark:text-slate-400 font-semibold mb-6">{description}</p>
        <div className="flex justify-end space-x-2 text-xs">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-505 hover:bg-rose-500 text-white rounded-lg font-bold transition shadow-md shadow-rose-600/10"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
