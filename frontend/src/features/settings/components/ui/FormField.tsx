import React, { useState } from 'react';
import { Eye, EyeOff, LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  required,
  isTextArea = false,
  icon: Icon,
}: {
  label: string;
  name?: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  isTextArea?: boolean;
  icon?: LucideIcon;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  const inputId = name ?? label.toLowerCase().replace(/\s+/g, '_');
  const hasIcon = !!Icon;

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {hasIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon className="h-4 w-4" />
          </span>
        )}
        {isTextArea ? (
          <textarea
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={3}
            className={`w-full ${hasIcon ? 'pl-9' : 'px-3.5'} py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition shadow-sm`}
          />
        ) : (
          <input
            id={inputId}
            type={isPassword && !showPwd ? 'password' : type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={`w-full ${hasIcon ? 'pl-9' : 'px-3.5'} pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition shadow-sm`}
          />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{hint}</p>}
    </div>
  );
}
