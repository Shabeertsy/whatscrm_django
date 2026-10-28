import React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { ConfirmedBooking } from '../../api';
import { ExtraFieldColumn } from './types';
import { ConfirmedBookingRow } from './ConfirmedBookingRow';
import { TablePagination } from '../../../../components/shared/TablePagination';

interface ConfirmedBookingsTableProps {
  bookings: ConfirmedBooking[];
  totalBookingsCount: number;
  loading: boolean;
  extraFieldColumns: ExtraFieldColumn[];
  deletingId: string | null;
  selectedPipeline?: string;
  onView: (booking: ConfirmedBooking) => void;
  onEdit: (booking: ConfirmedBooking) => void;
  onDelete: (booking: ConfirmedBooking) => void;
  onOpenNote: (booking: ConfirmedBooking) => void;

  // Pagination props
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

export function ConfirmedBookingsTable({
  bookings,
  totalBookingsCount,
  loading,
  extraFieldColumns,
  deletingId,
  selectedPipeline,
  onView,
  onEdit,
  onDelete,
  onOpenNote,
  page,
  pageSize = 10,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}: ConfirmedBookingsTableProps) {
  const totalColumns = 5 + extraFieldColumns.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deal / Contact</th>
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pipeline</th>
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
              {extraFieldColumns.map(col => (
                <th key={col.key} className="px-6 py-2.5 whitespace-nowrap text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[90px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className="px-4 py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#007e3a] mx-auto mb-2" />
                  <span className="text-xs text-slate-400 font-medium">Loading confirmed bookings...</span>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="px-4 py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <CheckCircle className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {totalBookingsCount === 0
                        ? 'No confirmed bookings yet'
                        : 'No bookings match your filters'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {totalBookingsCount === 0
                        ? 'Mark a pipeline stage as "Confirmed" and move deals into it'
                        : 'Try adjusting your search or pipeline filter'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map(booking => (
                <ConfirmedBookingRow
                  key={booking.id}
                  booking={booking}
                  extraFieldColumns={extraFieldColumns}
                  isDeleting={deletingId === booking.id}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenNote={onOpenNote}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {page && totalPages && onPageChange && onPageSizeChange && totalBookingsCount > 0 ? (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalBookingsCount}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={loading}
          itemLabel="confirmed bookings"
        />
      ) : (
        !loading && bookings.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <b className="text-slate-800 dark:text-slate-200 font-semibold">{bookings.length}</b> of{' '}
              <b className="text-slate-800 dark:text-slate-200 font-semibold">{totalBookingsCount}</b> confirmed bookings
              {selectedPipeline && ` · Pipeline: ${selectedPipeline}`}
            </span>
          </div>
        )
      )}
    </div>
  );
}
