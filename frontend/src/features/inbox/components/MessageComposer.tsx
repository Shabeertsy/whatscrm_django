import React, { useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";

interface MessageComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMediaSelect?: (file: File) => void;
  disabled?: boolean;
  replyingTo?: any;
  onCancelReply?: () => void;
}

export function MessageComposer({ value, onChange, onSubmit, onMediaSelect, disabled, replyingTo, onCancelReply }: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition duration-200">
      {disabled && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs text-center border-b border-amber-100 dark:border-amber-500/20 font-medium">
          WhatsApp 24-hour window has expired. You can only send template messages to this customer.
        </div>
      )}
      
      {replyingTo && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex-1 flex flex-col min-w-0 pr-4">
            <span className="text-[11px] font-semibold text-[#007e3a] dark:text-[#00b359] mb-0.5">
              Replying to {replyingTo.sent_by_name || (replyingTo.direction === 'inbound' ? 'Customer' : 'Agent')}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {replyingTo.msg_type === 'text' ? replyingTo.body : `[${replyingTo.msg_type}] ${replyingTo.body || ''}`}
            </span>
          </div>
          {replyingTo.media_url && (
            <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-black/10 mr-3">
              {replyingTo.msg_type === 'image' ? (
                <img src={replyingTo.media_url} alt="" className="w-full h-full object-cover" />
              ) : replyingTo.msg_type === 'video' ? (
                <video src={replyingTo.media_url} className="w-full h-full object-cover" />
              ) : null}
            </div>
          )}
          <button onClick={onCancelReply} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="p-4 flex items-center space-x-2 relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && onMediaSelect) {
              onMediaSelect(e.target.files[0]);
              e.target.value = ''; // reset
            }
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 flex items-center justify-center rounded-full transition ${disabled ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-[#007e3a] hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Attach File"
        >
          <Paperclip className="h-5 w-5" />
        </button>
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
          className={`p-2 flex items-center justify-center rounded-lg transition ${disabled ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-[#007e3a] hover:bg-[#00662f] text-white'}`}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default MessageComposer;
