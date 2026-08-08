import React from 'react';
import { ChevronRight, List } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  description?: string;
}

interface InteractiveListPayload {
  type: 'interactive_list';
  body: string;
  header?: string;
  footer?: string;
  button_label?: string;
  options: Option[];
}

interface InteractiveMessageProps {
  body: string;
  isOutbound: boolean;
}

export function InteractiveMessage({ body, isOutbound }: InteractiveMessageProps) {
  if (isOutbound) {
    try {
      const data: InteractiveListPayload = JSON.parse(body);
      if (data.type === 'interactive_list') {
        return <InteractiveListOutbound data={data} />;
      }
    } catch {

    }
  }

  // Inbound: customer clicked a menu option 
  return <InteractiveReplyInbound label={body} />;
}


//  Outbound: the menu we sent with clickable rows
// ──────────────────────────────────────────────────────────────
function InteractiveListOutbound({ data }: { data: InteractiveListPayload }) {
  return (

    <div className="flex flex-col w-full min-w-[220px] max-w-[300px]">
      {/* Header */}
      {data.header && (
        <div className="font-semibold text-[12px] text-slate-800 dark:text-slate-100 mb-1">
          {data.header}
        </div>
      )}

      {/* Body */}
      <div className="text-[13px] text-slate-800 dark:text-slate-100 leading-snug whitespace-pre-wrap mb-2">
        {data.body}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-600 my-1" />

      {/* Options list */}
      <div className="flex flex-col gap-[3px] mb-1">
        {data.options.map((opt, i) => (
          <div
            key={opt.id || i}
            className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-slate-600 gap-2"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-medium text-slate-800 dark:text-slate-200 truncate">
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {opt.description}
                </span>
              )}
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          </div>
        ))}
      </div>

      {/* WhatsApp-style "View options" button */}
      <div className="border-t border-slate-200 dark:border-slate-600 mt-1 pt-1.5 flex items-center justify-center gap-1.5">
        <List className="h-3.5 w-3.5 text-[#007e3a] dark:text-[#00b359]" />
        <span className="text-[12px] font-semibold text-[#007e3a] dark:text-[#00b359]">
          {data.button_label || 'View Options'}
        </span>
      </div>

      {/* Footer */}
      {data.footer && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-center">
          {data.footer}
        </div>
      )}
    </div>
  );
}


//  Inbound: the customer's option-click reply
// ──────────────────────────────────────────────────────────────
function InteractiveReplyInbound({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#f0f9f2] dark:bg-[#0a2e1a] border border-[#c3e6cd] dark:border-[#1a4d2e] min-w-[140px]">
      {/* Reply arrow icon */}
      <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#25d366]/20 dark:bg-[#25d366]/10">
        <svg className="w-3 h-3 text-[#007e3a] dark:text-[#25d366]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
        </svg>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#007e3a] dark:text-[#25d366]">
          Option Selected
        </span>
        <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
          {label}
        </span>
      </div>
    </div>
  );
}
