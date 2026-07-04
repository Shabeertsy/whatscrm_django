import React from "react";
import { Send } from "lucide-react";

interface MessageComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MessageComposer({ value, onChange, onSubmit }: MessageComposerProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2 transition duration-200">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type an automated response or reply as agent..."
        className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a]"
      />
      <button
        type="submit"
        className="p-2 bg-[#007e3a] hover:bg-[#00662f] text-white rounded-lg transition"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}

export default MessageComposer;
