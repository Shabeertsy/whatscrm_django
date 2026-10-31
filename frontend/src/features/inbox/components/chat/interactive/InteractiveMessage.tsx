import React from 'react';
import { ChevronRight, List, ClipboardCheck } from 'lucide-react';
import type { InteractiveData, InteractiveSelectedData } from '../../../../../api/messaging';

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

interface InteractiveButtonsPayload {
  type: 'interactive_buttons';
  body: string;
  header?: string;
  footer?: string;
  header_image_url?: string;
  related_room_uuid?: string;
  options: Option[];
}

type InteractivePayload = InteractiveListPayload | InteractiveButtonsPayload;

interface InteractiveMessageProps {
  body: string;
  isOutbound: boolean;
  interactiveData?: InteractiveData | null;
}

export function InteractiveMessage({ body, isOutbound, interactiveData }: InteractiveMessageProps) {
  if (isOutbound) {
    try {
      const data: InteractivePayload = JSON.parse(body);
      if (data.type === 'interactive_list') {
        return <InteractiveListOutbound data={data as InteractiveListPayload} />;
      }
      if (data.type === 'interactive_buttons') {
        return <InteractiveButtonsOutbound data={data as InteractiveButtonsPayload} />;
      }
    } catch {

    }
  }

  // Inbound: customer clicked a menu option or submitted a flow form
  return <InteractiveReplyInbound label={body} interactiveData={interactiveData} />;
}


//  Outbound: the menu we sent with clickable rows
// ──────────────────────────────────────────────────────────────
function InteractiveListOutbound({ data }: { data: InteractiveListPayload }) {
  return (
    <div className="flex flex-col w-full min-w-[180px] sm:min-w-[200px] max-w-[280px]">
      {data.header && (
        <div className="font-normal text-[9px] sm:text-[9.5px] md:text-[10px] text-slate-800 dark:text-slate-100 mb-1">
          {data.header}
        </div>
      )}

      <div className="text-[9px] sm:text-[9.5px] md:text-[10px] lg:text-[10.5px] text-slate-800 dark:text-slate-100 leading-snug whitespace-pre-wrap mb-1.5 font-normal">
        {data.body}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-600 my-1" />

      <div className="flex flex-col gap-[2px] mb-1">
        {data.options.map((opt, i) => (
          <div
            key={opt.id || i}
            className="flex items-center justify-between px-2 py-1 rounded-md bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-slate-600 gap-1.5"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[8.5px] sm:text-[9px] md:text-[9.5px] font-normal text-slate-800 dark:text-slate-200 truncate">
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[7.5px] sm:text-[8px] md:text-[8.5px] text-slate-400 dark:text-slate-500 truncate font-normal">
                  {opt.description}
                </span>
              )}
            </div>
            <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
          </div>
        ))}
      </div>

      {/* WhatsApp-style "View options" button */}
      <div className="border-t border-slate-200 dark:border-slate-600 mt-1 pt-1 flex items-center justify-center gap-1">
        <List className="h-3 w-3 text-[#007e3a] dark:text-[#00b359]" />
        <span className="text-[9px] sm:text-[9.5px] md:text-[10px] font-normal text-[#007e3a] dark:text-[#00b359]">
          {data.button_label || 'View Options'}
        </span>
      </div>

      {data.footer && (
        <div className="text-[7.5px] sm:text-[8px] md:text-[8.5px] text-slate-400 dark:text-slate-500 mt-1 text-center">
          {data.footer}
        </div>
      )}
    </div>
  );
}


//  Outbound: Button reply message (inline buttons)
// ──────────────────────────────────────────────────────────────
function InteractiveButtonsOutbound({ data }: { data: InteractiveButtonsPayload }) {
  return (
    <div className="flex flex-col w-full min-w-[180px] max-w-[280px]">
      {data.header_image_url && (
        <div className="w-full h-24 sm:h-28 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1.5 relative">
          <img
            src={data.header_image_url}
            alt="Property Header"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {data.header && (
        <div className="font-normal text-[9px] sm:text-[9.5px] md:text-[10px] text-slate-800 dark:text-slate-100 mb-1">
          {data.header}
        </div>
      )}

      <div className="text-[9px] sm:text-[9.5px] md:text-[10px] lg:text-[10.5px] text-slate-800 dark:text-slate-100 leading-snug whitespace-pre-wrap mb-2 font-normal">
        {data.body}
      </div>

      {/* WhatsApp-style reply buttons */}
      <div className="flex flex-col gap-1">
        {data.options.map((opt, i) => (
          <div
            key={opt.id || i}
            className="flex items-center justify-center px-2 py-1 rounded-lg border border-[#007e3a]/50 dark:border-[#25d366]/30 bg-white/70 dark:bg-white/5 hover:bg-[#007e3a]/5 dark:hover:bg-[#25d366]/10 transition-colors cursor-default"
          >
            <span className="text-[9px] sm:text-[9.5px] md:text-[10px] font-normal text-[#007e3a] dark:text-[#25d366] text-center">
              {opt.label}
            </span>
          </div>
        ))}
      </div>

      {data.footer && (
        <div className="text-[7.5px] sm:text-[8px] md:text-[8.5px] text-slate-400 dark:text-slate-500 mt-1 text-center">
          {data.footer}
        </div>
      )}
    </div>
  );
}


//  Inbound: customer's option-click reply or form submission
// ──────────────────────────────────────────────────────────────
interface InteractiveReplyInboundProps {
  label: string;
  interactiveData?: InteractiveData | null;
}

function parseFallbackFields(text: string): InteractiveSelectedData[] {
  if (!text) return [];
  const clean = text.trim();

  // Try parsing JSON if body was stored as JSON
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const obj = JSON.parse(clean);
      if (typeof obj === 'object' && obj !== null) {
        const results: InteractiveSelectedData[] = [];
        for (const [k, v] of Object.entries(obj)) {
          if (k.startsWith('_') || k === 'flow_token' || k.endsWith('_uuid') || k.endsWith('_labels')) continue;
          const displayLabel = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          let displayVal = String(v ?? '');
          if (Array.isArray(v)) displayVal = v.join(', ');
          else if (typeof v === 'boolean') displayVal = v ? 'Yes' : 'No';
          if (displayVal.trim()) {
            results.push({ key: k, label: displayLabel, value: displayVal });
          }
        }
        if (results.length > 0) return results;
      }
    } catch {
      // not JSON
    }
  }

  // Try parsing [Form Submitted] Key: Value lines
  if (clean.includes(':')) {
    const lines = clean.split('\n');
    const results: InteractiveSelectedData[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('[') || !trimmed.includes(':')) continue;
      const idx = trimmed.indexOf(':');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (k && v) {
        results.push({ key: k, label: k, value: v });
      }
    }
    if (results.length > 0) return results;
  }

  return [];
}

function InteractiveReplyInbound({ label, interactiveData }: InteractiveReplyInboundProps) {
  const items: InteractiveSelectedData[] =
    interactiveData?.selected_data && interactiveData.selected_data.length > 0
      ? interactiveData.selected_data
      : parseFallbackFields(label);

  const isFormOrMulti =
    interactiveData?.type === 'nfm_reply' ||
    items.length > 1 ||
    (items.length === 1 && items[0].key !== 'button' && items[0].key !== 'selection');

  // Case A: Multi-field form submission (WhatsApp Flow, Form responses)
  if (isFormOrMulti && items.length > 0) {
    const title =
      interactiveData?.title ||
      interactiveData?.flow_name ||
      'Form Submission';

    return (
      <div className="flex flex-col gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl bg-[#f0f9f2] dark:bg-[#0a2e1a] border border-[#c3e6cd] dark:border-[#1a4d2e] min-w-[200px] sm:min-w-[220px] max-w-[320px] shadow-xs">
        {/* Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="shrink-0 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#25d366]/20 dark:bg-[#25d366]/15 text-[#007e3a] dark:text-[#25d366]">
            <ClipboardCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[7.5px] sm:text-[8px] md:text-[9px] font-normal uppercase tracking-wider text-[#007e3a] dark:text-[#25d366]">
              Selection Submitted
            </span>
            <span className="text-[10.5px] sm:text-[11px] md:text-[12px] font-normal text-slate-800 dark:text-slate-100 truncate">
              {title}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#c3e6cd]/60 dark:border-[#1a4d2e]/60" />

        {/* Selected Data Fields */}
        <div className="flex flex-col gap-1 sm:gap-1.5">
          {items.map((item, idx) => (
            <div
              key={item.key || idx}
              className="flex items-baseline justify-between gap-2.5 sm:gap-3 py-0.5 border-b border-[#c3e6cd]/30 dark:border-[#1a4d2e]/30 last:border-b-0"
            >
              <span className="text-[9px] sm:text-[9.5px] md:text-[10px] font-normal text-slate-600 dark:text-slate-400 shrink-0">
                {item.label}:
              </span>
              <span className="text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-normal text-slate-900 dark:text-slate-100 text-right break-words bg-white/70 dark:bg-white/10 px-1.5 py-0.5 rounded border border-[#c3e6cd]/40 dark:border-white/5">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Case B: Single option selected (Button reply or List row)
  const singleLabel =
    items.length === 1 ? items[0].value : label === 'Sent' ? 'Form Submitted' : label;
  const singleDesc = items.length === 1 ? items[0].description : interactiveData?.description;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-[#f0f9f2] dark:bg-[#0a2e1a] border border-[#c3e6cd] dark:border-[#1a4d2e] min-w-[130px] sm:min-w-[140px] max-w-[300px]">
      {/* Reply arrow icon */}
      <div className="shrink-0 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#25d366]/20 dark:bg-[#25d366]/10 text-[#007e3a] dark:text-[#25d366]">
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
        </svg>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[8px] sm:text-[8.5px] md:text-[9.5px] font-normal uppercase tracking-wider text-[#007e3a] dark:text-[#25d366]">
          Option Selected
        </span>
        <span className="text-[10.5px] sm:text-[11px] md:text-[12px] font-normal text-slate-800 dark:text-slate-100 truncate">
          {singleLabel}
        </span>
        {singleDesc && (
          <span className="text-[9px] sm:text-[9.5px] md:text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
            {singleDesc}
          </span>
        )}
      </div>
    </div>
  );
}
