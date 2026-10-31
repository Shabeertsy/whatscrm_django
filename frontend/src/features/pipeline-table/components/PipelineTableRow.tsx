import React from 'react';
import { Pencil, Trash2, Loader2, FileText, Plus } from 'lucide-react';
import { Deal, PipelineStage } from '../../pipeline/api';
import type { AssignableAgent } from '../../../api/messaging';
import { ExtraFieldColumn } from '../types';
import { PipelineAssignUserCell } from './PipelineAssignUserCell';
import { PipelineStageSelectCell } from './PipelineStageSelectCell';


interface PipelineTableRowProps {
  deal: Deal;
  stages: PipelineStage[];
  extraFieldColumns: ExtraFieldColumn[];
  agents?: AssignableAgent[];
  isDeleting: boolean;
  onStageChange: (dealId: string, stageId: string) => void;
  onAssignUser?: (dealId: string, agentId: string | null) => void;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onOpenNote: (deal: Deal) => void;
}

export function PipelineTableRow({
  deal,
  stages,
  extraFieldColumns,
  agents = [],
  isDeleting,
  onStageChange,
  onAssignUser,
  onView,
  onEdit,
  onDelete,
  onOpenNote,
}: PipelineTableRowProps) {
  const currentStage = stages.find(s => String(s.id) === String(deal.stage));
  const contactName = deal.contact_name || deal.manual_contact || '';
  const phone = deal.contact_phone || '';

  const chatDate = deal.chat_started_at || deal.created_at;

  const formatDate = (dateStr?: string | null) => {
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

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <tr className="group hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
      {/* Date (Chat started date - no deal name) */}
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div
          onClick={() => onEdit(deal)}
          className="group/date flex flex-col cursor-pointer text-left select-none"
          title="Click to view/edit deal"
        >
          <span className="font-medium text-slate-800 dark:text-slate-200 text-sm group-hover/date:text-[#007e3a] dark:group-hover/date:text-[#00b355] transition-colors">
            {formatDate(chatDate)}
          </span>
          {formatTime(chatDate) && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              {formatTime(chatDate)}
            </span>
          )}
        </div>
      </td>

      {/* Contact */}
      <td className="px-6 py-3.5">
        <div className="flex flex-col gap-0.5 min-w-[150px]">
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-slate-800 dark:text-slate-200 text-sm truncate max-w-[150px]">
              {contactName || <span className="text-slate-400 italic font-normal text-xs">No contact</span>}
            </span>
            {deal.wa_contact && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-[#007e3a] dark:text-[#00b355] border border-emerald-200/80 dark:border-emerald-800/60 leading-none shrink-0"
                title="Linked WhatsApp Contact"
              >
                WA
              </span>
            )}
          </div>
          {phone ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight font-normal">
              {phone}
            </span>
          ) : contactName ? (
            <span className="text-[11px] text-slate-400 italic">No phone</span>
          ) : null}
        </div>
      </td>

      {/* Assigned User */}
      <td className="px-6 py-3.5 whitespace-nowrap">
        <PipelineAssignUserCell
          dealId={deal.id}
          assignedUser={deal.assigned_user}
          agents={agents}
          onAssignUser={onAssignUser}
        />
      </td>


      {/* Stage Selector */}
      <td className="px-6 py-3.5 whitespace-nowrap">
        <PipelineStageSelectCell
          dealId={deal.id}
          stageId={deal.stage}
          stages={stages}
          onStageChange={onStageChange}
        />
      </td>

      {/* Value */}
      <td className="px-6 py-3.5 whitespace-nowrap">
        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm tabular-nums">
          ₹{Number(deal.value || 0).toLocaleString('en-IN')}
        </span>
      </td>

      {/* Dynamic Extra Fields */}
      {extraFieldColumns.map(col => {
        const rawVal = deal.extra_data?.[col.key];
        const val = typeof rawVal === 'object' && rawVal !== null
          ? (rawVal.name || rawVal.label || rawVal.username || rawVal.title || JSON.stringify(rawVal))
          : rawVal;
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
        return (
          <td key={col.key} className="px-6 py-3.5 whitespace-nowrap">
            {hasVal ? (
              <span className="text-[12.5px] xl:text-[13px] font-normal text-slate-700 dark:text-slate-300">
                {String(val)}
              </span>
            ) : (
              <span className="text-slate-300 dark:text-slate-600 text-[12.5px] xl:text-[13px]">—</span>
            )}
          </td>
        );
      })}

      {/* Notes (Click-to-edit) */}
      <td className="px-6 py-3.5 min-w-[150px]">
        {deal.note ? (
          <div
            onClick={() => onOpenNote(deal)}
            className="group/note inline-flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1 -mx-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors max-w-[200px]"
            title={`Note: ${deal.note}`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover/note:text-[#007e3a] shrink-0 transition-colors" />
            <span className="text-[12.5px] xl:text-[13px] truncate">{deal.note}</span>
            <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/note:opacity-100 shrink-0 transition-opacity ml-auto" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenNote(deal)}
            className="inline-flex items-center gap-1 text-[11.5px] xl:text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 -mx-2 rounded transition-colors"
          >
            <Plus className="w-3 h-3 text-slate-400" />
            <span>Note</span>
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(deal)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit deal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(deal)}
            disabled={isDeleting}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
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

export default PipelineTableRow;
