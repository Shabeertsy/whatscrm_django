import React from 'react';
import { X } from 'lucide-react';
import { ConfirmedBooking } from '../../api';
import { EditingBookingFormData, BookingFieldConfig } from './types';


interface EditBookingModalProps {
  data: EditingBookingFormData | null;
  saving: boolean;
  onUpdateField: (field: string, value: any) => void;
  onUpdateExtraData: (key: string, value: any) => void;
  onClose: () => void;
  onSave: () => void;
  getBookingFields: (booking: ConfirmedBooking) => BookingFieldConfig[];
}

export function EditBookingModal({
  data,
  saving,
  onUpdateField,
  onUpdateExtraData,
  onClose,
  onSave,
  getBookingFields,
}: EditBookingModalProps) {
  if (!data) return null;

  const extraFields = getBookingFields(data.rawBooking);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Edit Confirmed Booking
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
              {data.rawBooking.confirmed_pipeline_name} · {data.rawBooking.confirmed_stage_title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deal Name *
              </label>
              <input
                type="text"
                value={data.name}
                onChange={e => onUpdateField('name', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                placeholder="Booking / Deal name"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Booking Value (₹)
              </label>
              <input
                type="number"
                value={data.value}
                onChange={e => onUpdateField('value', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                placeholder="0"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={data.contact_name}
                onChange={e => onUpdateField('contact_name', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                placeholder="Customer Name"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={data.contact_phone}
                onChange={e => onUpdateField('contact_phone', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                placeholder="Phone number"
                disabled={saving}
              />
            </div>
          </div>

          {/* Dynamic Extra Fields */}
          {extraFields.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Custom Fields
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {f.type === 'select' && f.options && f.options.length > 0 ? (
                      <select
                        value={data.extra_data[f.key] || ''}
                        onChange={e => onUpdateExtraData(f.key, e.target.value)}
                        disabled={saving}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                      >
                        <option value="">-- Select --</option>
                        {f.options.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                        value={data.extra_data[f.key] || ''}
                        onChange={e => onUpdateExtraData(f.key, e.target.value)}
                        disabled={saving}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              rows={4}
              value={data.note}
              onChange={e => onUpdateField('note', e.target.value)}
              placeholder="Additional notes about this confirmed booking..."
              disabled={saving}
              className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007e3a] transition-colors resize-y"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#007e3a] hover:bg-[#006830] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
