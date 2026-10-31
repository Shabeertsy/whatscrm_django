import React from 'react';
import { Eye, Pencil, Trash2, Loader2, Phone } from 'lucide-react';
import { ConfirmedBooking } from '../../api';
import { ExtraFieldColumn } from './types';


interface ConfirmedBookingRowProps {
  booking: ConfirmedBooking;
  extraFieldColumns: ExtraFieldColumn[];
  isDeleting: boolean;
  onView: (booking: ConfirmedBooking) => void;
  onEdit: (booking: ConfirmedBooking) => void;
  onDelete: (booking: ConfirmedBooking) => void;
  onOpenNote: (booking: ConfirmedBooking) => void;
}


export function ConfirmedBookingRow({
  booking,
  extraFieldColumns,
  isDeleting,
  onView,
  onEdit,
  onDelete,
  onOpenNote,
}: ConfirmedBookingRowProps) {
  const stageDeleted = !booking.stage;
  const contactName = booking.contact_name || booking.manual_contact || '';
  const phone = booking.contact_phone || '';
  const isDifferentContact =
    contactName && contactName.toLowerCase().trim() !== booking.name.toLowerCase().trim();

  return (
    <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      {/* Deal / Contact */}
      <td className="px-3.5 xl:px-5 py-2.5 xl:py-3">
        <div className="flex flex-col gap-0.5 min-w-[140px] xl:min-w-[150px]">
          <span className="font-medium text-slate-800 dark:text-slate-200 text-xs xl:text-sm leading-snug">
            {booking.name}
          </span>

          {isDifferentContact && (
            <span className="text-[11px] xl:text-xs text-slate-500 dark:text-slate-400 font-normal leading-snug">
              {contactName}
            </span>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 text-[11px] xl:text-xs text-slate-500 dark:text-slate-400 hover:text-[#007e3a] dark:hover:text-[#00b355] transition-colors w-fit mt-0.5"
              title="Call contact"
            >
              <Phone className="h-3 w-3 xl:h-3.5 xl:w-3.5 text-slate-400 flex-shrink-0" />
              <span className="font-mono tracking-tight font-normal">{phone}</span>
            </a>
          )}
        </div>
      </td>

      {/* Pipeline & Stage */}
      <td className="px-3.5 xl:px-5 py-2.5 xl:py-3">
        <div className="flex flex-col gap-1 min-w-[120px] xl:min-w-[130px]">
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-xs xl:text-sm text-slate-700 dark:text-slate-300 truncate max-w-[130px] xl:max-w-[150px]">
              {booking.confirmed_pipeline_name || '—'}
            </span>
            {!booking.pipeline && (
              <span className="text-[9px] xl:text-[9.5px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                (deleted)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 xl:px-2 py-0.5 rounded-md text-[10.5px] xl:text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 w-fit">
              ✓ {booking.confirmed_stage_title || '—'}
            </span>
            {stageDeleted && (
              <span className="text-[9px] xl:text-[9.5px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                (deleted)
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Value */}
      <td className="px-3.5 xl:px-5 py-2.5 xl:py-3">
        <span className="font-medium text-slate-800 dark:text-slate-200 text-xs xl:text-[14.5px] tabular-nums">
          ₹{Number(booking.value || 0).toLocaleString('en-IN')}
        </span>
      </td>

      {/* Dynamic Extra Fields Columns */}
      {extraFieldColumns.map(col => {
        const rawVal = booking.extra_data?.[col.key];
        const val = typeof rawVal === 'object' && rawVal !== null
          ? (rawVal.name || rawVal.label || rawVal.username || rawVal.title || JSON.stringify(rawVal))
          : rawVal;
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
        return (
          <td key={col.key} className="px-3.5 xl:px-5 py-2.5 xl:py-3 whitespace-nowrap">
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

      {/* Notes */}
      <td className="px-3.5 xl:px-5 py-2.5 xl:py-3 min-w-[180px] xl:min-w-[200px]">
        <div
          onClick={() => onOpenNote(booking)}
          className="group/note flex items-center justify-between gap-2 cursor-pointer rounded-lg px-2 xl:px-2.5 py-1 xl:py-1.5 -mx-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
          title="Click to view and edit note"
        >
          {booking.note ? (
            <p
              className="text-[12.5px] xl:text-[13px] text-slate-600 dark:text-slate-300 max-w-[220px] xl:max-w-[240px] line-clamp-2 leading-relaxed"
              title={booking.note}
            >
              {booking.note}
            </p>
          ) : (
            <span className="text-[12px] xl:text-[12.5px] text-slate-400 dark:text-slate-500 italic">
              + Add note
            </span>
          )}
          <Pencil className="h-3 w-3 xl:h-3.5 xl:w-3.5 text-slate-400 group-hover/note:text-[#007e3a] opacity-0 group-hover/note:opacity-100 transition-all flex-shrink-0" />
        </div>
      </td>

      {/* Actions: View, Edit, Delete */}
      <td className="px-3.5 xl:px-5 py-2.5 xl:py-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onView(booking)}
            className="inline-flex items-center justify-center h-7 w-7 xl:h-8 xl:w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="View booking details"
          >
            <Eye className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(booking)}
            className="inline-flex items-center justify-center h-7 w-7 xl:h-8 xl:w-8 rounded-lg text-slate-400 hover:text-[#007e3a] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            title="Edit booking"
          >
            <Pencil className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(booking)}
            disabled={isDeleting}
            className="inline-flex items-center justify-center h-7 w-7 xl:h-8 xl:w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
            title="Delete booking record"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 xl:h-4 xl:w-4 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
