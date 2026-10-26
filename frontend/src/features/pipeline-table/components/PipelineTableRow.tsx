import React from 'react';
import { Pencil, Trash2, Loader2, Check, ChevronDown, FileText, Plus } from 'lucide-react';
import { Deal, PipelineStage } from '../../pipeline/api';
import { ExtraFieldColumn } from '../types';


interface PipelineTableRowProps {
  deal: Deal;
  stages: PipelineStage[];
  extraFieldColumns: ExtraFieldColumn[];
  isDeleting: boolean;
  onStageChange: (dealId: string, stageId: string) => void;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onOpenNote: (deal: Deal) => void;
}

export function PipelineTableRow({
  deal,
  stages,
  extraFieldColumns,
  isDeleting,
  onStageChange,
  onView,
  onEdit,
  onDelete,
  onOpenNote,
}: PipelineTableRowProps) {
  const currentStage = stages.find(s => String(s.id) === String(deal.stage));
  const contactName = deal.contact_name || deal.manual_contact || '';
  const phone = deal.contact_phone || '';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <tr className="group hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
      {/*  Deal Name (Clickable title for fast edit/view) */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-0.5 min-w-[150px]">
          <button
            type="button"
            onClick={() => onEdit(deal)}
            className="text-left font-semibold text-slate-900 dark:text-slate-100 text-sm hover:text-[#007e3a] dark:hover:text-[#00b355] transition-colors line-clamp-1 cursor-pointer"
            title="Click to view/edit deal"
          >
            {deal.name}
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
            {formatDate(deal.created_at)}
          </span>
        </div>
      </td>

      {/*  Contact */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-0.5 min-w-[150px]">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate max-w-[150px]">
              {contactName || <span className="text-slate-400 italic font-normal text-xs">No contact</span>}
            </span>
            {deal.wa_contact && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-[#007e3a] dark:text-[#00b355] border border-emerald-200/80 dark:border-emerald-800/60 leading-none shrink-0"
                title="Linked WhatsApp Contact"
              >
                WA
              </span>
            )}
          </div>
          {phone ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight">
              {phone}
            </span>
          ) : contactName ? (
            <span className="text-[11px] text-slate-400 italic">No phone</span>
          ) : null}
        </div>
      </td>

      {/*  Stage Selector (Custom Status Badge Pill) */}
      <td className="px-4 py-3.5">
        <div className="relative inline-flex items-center min-w-[130px]">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border pointer-events-none transition-colors ${currentStage?.is_confirmed
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
          >
            {currentStage?.is_confirmed ? (
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            )}
            <span className="truncate max-w-[110px]">
              {currentStage?.title || 'Select stage'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
          </div>
          <select
            value={deal.stage || ''}
            onChange={e => onStageChange(deal.id, e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Change stage"
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>
                {s.title} {s.is_confirmed ? '✓ Confirmed' : ''}
              </option>
            ))}
          </select>
        </div>
      </td>

      {/*  Value */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm tabular-nums">
          ₹{Number(deal.value || 0).toLocaleString('en-IN')}
        </span>
      </td>

      {/*  Dynamic Extra Fields */}
      {extraFieldColumns.map(col => {
        const val = deal.extra_data?.[col.key];
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
        return (
          <td key={col.key} className="px-4 py-3.5 whitespace-nowrap">
            {hasVal ? (
              <span className="text-xs font-normal text-slate-700 dark:text-slate-300">
                {String(val)}
              </span>
            ) : (
              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
            )}
          </td>
        );
      })}

      {/*  Notes (Click-to-edit) */}
      <td className="px-4 py-3.5 min-w-[150px]">
        {deal.note ? (
          <div
            onClick={() => onOpenNote(deal)}
            className="group/note inline-flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1 -mx-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors max-w-[200px]"
            title={`Note: ${deal.note}`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover/note:text-[#007e3a] shrink-0 transition-colors" />
            <span className="text-xs truncate">{deal.note}</span>
            <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/note:opacity-100 shrink-0 transition-opacity ml-auto" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenNote(deal)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 -mx-2 rounded transition-colors"
          >
            <Plus className="w-3 h-3 text-slate-400" />
            <span>Note</span>
          </button>
        )}
      </td>

      {/*  Actions */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(deal)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit deal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(deal)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
            title="Delete deal"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
