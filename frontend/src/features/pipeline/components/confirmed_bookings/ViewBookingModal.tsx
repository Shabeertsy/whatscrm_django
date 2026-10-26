import React from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmedBooking } from '../../api';
import { BookingFieldConfig } from './types';


interface ViewBookingModalProps {
  booking: ConfirmedBooking | null;
  onClose: () => void;
  onEdit: (booking: ConfirmedBooking) => void;
  getBookingFields: (booking: ConfirmedBooking) => BookingFieldConfig[];
}

export function ViewBookingModal({
  booking,
  onClose,
  onEdit,
  getBookingFields,
}: ViewBookingModalProps) {
  if (!booking) return null;

  const handleCopyPhone = (phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success('Phone number copied to clipboard');
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const fields = getBookingFields(booking);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg md:max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Booking Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
              {booking.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Value & Stage Card */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Booking Value
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                ₹{Number(booking.value || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-[#007e3a] dark:text-[#00b355] border border-emerald-200 dark:border-emerald-800/60 w-fit">
                {booking.confirmed_stage_title || 'Confirmed'}
              </span>
              <span className="text-xs text-slate-500">
                Pipeline: <span className="font-medium text-slate-700 dark:text-slate-300">{booking.confirmed_pipeline_name}</span>
              </span>
            </div>
          </div>

          {/* Confirmed Date */}
          {booking.confirmed_at && (
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
              Confirmed on <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDateTime(booking.confirmed_at)}</span>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Contact Information
            </h4>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {booking.contact_name || booking.manual_contact || 'No contact name'}
                </p>
                {booking.contact_phone ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {booking.contact_phone}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No phone number</p>
                )}
              </div>
              {booking.contact_phone && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(booking.contact_phone!)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    Copy
                  </button>
                  <a
                    href={`tel:${booking.contact_phone}`}
                    className="px-2.5 py-1 text-xs font-medium rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-[#007e3a] dark:text-[#00b355] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    Call
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Custom Deal Fields */}
          {fields.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Custom Fields
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {fields.map(f => {
                  const val = booking.extra_data?.[f.key];
                  const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
                  return (
                    <div
                      key={f.key}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
                    >
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{f.label}</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 break-words">
                        {hasVal ? String(val) : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Notes
            </h4>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              {booking.note ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {booking.note}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No notes added</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(booking);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#007e3a] hover:bg-[#006830] transition-colors"
          >
            Edit Booking
          </button>
        </div>
      </div>
    </div>
  );
}
