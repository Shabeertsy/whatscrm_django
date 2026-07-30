import React from "react";
import { AlertTriangle, Loader2, Trash, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  isDestructive = true,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            {isDestructive ? (
              <Trash className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            {title}
          </h4>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="py-2 space-y-2">
          {typeof description === 'string' ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              {description}
            </p>
          ) : (
            description
          )}
        </div>
        
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-4 py-2 ${
              isDestructive 
                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20" 
                : "bg-[#007e3a] hover:bg-[#00602d] text-white shadow-sm shadow-emerald-600/20"
            } disabled:opacity-50 font-bold text-xs rounded-lg transition-colors cursor-pointer`}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isDestructive ? (
              <Trash className="h-3.5 w-3.5" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
