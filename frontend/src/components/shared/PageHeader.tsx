import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6 min-w-0 transition duration-200">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
