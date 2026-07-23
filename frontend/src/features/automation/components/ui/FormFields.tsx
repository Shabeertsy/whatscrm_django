import React from "react";


// Shared className tokens — single source of truth for all panel inputs
export const CLS = {
  base: "w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none transition-colors",
  mono: "font-mono",
  resize: "resize-none",
  focusGreen: "focus:border-[#007e3a]",
  focusPurple: "focus:border-purple-500",
  focusEmerald: "focus:border-emerald-500",
  focusRose: "focus:border-rose-500",
  focusOrange: "focus:border-orange-500",
  focusIndigo: "focus:border-indigo-500",
  focusAmber: "focus:border-amber-500",
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
    <label className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 ${className ?? ""}`}>
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
