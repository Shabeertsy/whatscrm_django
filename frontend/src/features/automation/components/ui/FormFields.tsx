import React from "react";


// Shared className tokens — single source of truth for all panel inputs
export const CLS = {
  base: "w-full bg-slate-50/80 hover:bg-slate-50 dark:bg-[#131924]/80 dark:hover:bg-[#131924] border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-[#131924] transition-all duration-200 shadow-sm",
  mono: "font-mono text-[11px]",
  resize: "resize-none",
  focusGreen: "focus:border-[#007e3a] focus:ring-2 focus:ring-[#007e3a]/20",
  focusPurple: "focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
  focusEmerald: "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
  focusRose: "focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20",
  focusOrange: "focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
  focusIndigo: "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
  focusAmber: "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20",
} as const;

export function cls(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}




// Field primitives
interface LabelProps {
  children: React.ReactNode;
  className?: string;
}
export function FieldLabel({ children, className }: LabelProps) {
  return (
    <label className={`text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1 ${className ?? ""}`}>
      {children}
    </label>
  );
}




interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  focus?: keyof typeof CLS;
  mono?: boolean;
}
export function FieldInput({ focus = "focusGreen", mono = false, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cls(CLS.base, CLS[focus], mono ? CLS.mono : undefined)}
    />
  );
}




interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  focus?: keyof typeof CLS;
  rows?: number;
}
export function FieldTextarea({ focus = "focusGreen", rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={cls(CLS.base, CLS[focus], CLS.resize)}
    />
  );
}




interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  focus?: keyof typeof CLS;
  children: React.ReactNode;
}
export function FieldSelect({ focus = "focusGreen", children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cls(CLS.base, CLS[focus])}
    >
      {children}
    </select>
  );
}


interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
}
export function FieldGroup({ label, children }: FieldGroupProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
