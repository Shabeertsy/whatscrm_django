import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-1.5 md:mb-2 min-w-0 transition duration-200">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-2.5">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
