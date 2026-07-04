import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon: Icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-center transition duration-200">
      {Icon && (
        <div className="p-3 bg-[#007e3a]/10 dark:bg-[#007e3a]/20 rounded-full text-[#007e3a] mb-4">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-xs mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg shadow-md transition duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
