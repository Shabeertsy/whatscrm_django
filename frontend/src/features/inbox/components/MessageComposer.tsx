import React from "react";
import { Send } from "lucide-react";



interface MessageComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}


export function MessageComposer({ value, onChange, onSubmit, disabled }: MessageComposerProps) {
  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition duration-200">
      {disabled && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs text-center border-b border-amber-100 dark:border-amber-500/20 font-medium">
          WhatsApp 24-hour window has expired. You can only send template messages to this customer.
        </div>
      )}
      <form onSubmit={onSubmit} className="p-4 flex items-end space-x-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!disabled) onSubmit(e);
            }
          }}
          disabled={disabled}
          placeholder={disabled ? "Messaging disabled..." : "Type an automated response or reply as agent..."}
          className={`flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] resize-none min-h-[44px] max-h-[150px] custom-scrollbar ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
          rows={value.split('\n').length > 1 ? Math.min(value.split('\n').length, 5) : 1}
        />
        <button
          type="submit"
          disabled={disabled}
          className={`p-2 rounded-lg transition ${disabled ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-[#007e3a] hover:bg-[#00662f] text-white'}`}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default MessageComposer;
