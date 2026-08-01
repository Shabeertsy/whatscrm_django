import React from 'react';

interface DealNoteSectionProps {
  note: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function DealNoteSection({ note, onChange, onBlur }: DealNoteSectionProps) {
  return (
    <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        Deal Note (Optional)
      </label>
      <textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Type your notes.."
        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none h-16 transition-colors placeholder:text-slate-400"
      />
    </div>
  );
}
