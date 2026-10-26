import React from 'react';
import { Loader2, Sliders } from 'lucide-react';
import { Deal, PipelineStage } from '../../pipeline/api';
import { ExtraFieldColumn } from '../types';
import { PipelineTableRow } from './PipelineTableRow';
import { PipelineTablePagination } from './PipelineTablePagination';

interface PipelineTableViewProps {
  deals: Deal[];
  totalDealsCount: number;
  stages: PipelineStage[];
  loading: boolean;
  extraFieldColumns: ExtraFieldColumn[];
  deletingId: string | null;
  pipelineName?: string;
  onStageChange: (dealId: string, stageId: string) => void;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onOpenNote: (deal: Deal) => void;

  // Pagination props
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function PipelineTableView({
  deals,
  totalDealsCount,
  stages,
  loading,
  extraFieldColumns,
  deletingId,
  pipelineName,
  onStageChange,
  onView,
  onEdit,
  onDelete,
  onOpenNote,
  page,
  pageSize = 10,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}: PipelineTableViewProps) {
  const totalColumns = 6 + extraFieldColumns.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Value</th>
              {extraFieldColumns.map(col => (
                <th key={col.key} className="px-4 py-3 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right min-w-[90px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className="px-4 py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#007e3a] mx-auto mb-2" />
                  <span className="text-xs text-slate-400 font-medium">Loading deals...</span>
                </td>
              </tr>
            ) : deals.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="px-4 py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Sliders className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {totalDealsCount === 0
                        ? 'No deals in this pipeline yet'
                        : 'No deals match your search criteria'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {totalDealsCount === 0
                        ? 'Click "+ New Deal" above to create your first deal'
                        : 'Try adjusting your search terms or stage filter'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              deals.map(deal => (
                <PipelineTableRow
                  key={deal.id}
                  deal={deal}
                  stages={stages}
                  extraFieldColumns={extraFieldColumns}
                  isDeleting={deletingId === deal.id}
                  onStageChange={onStageChange}
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

      {page && totalPages && onPageChange && onPageSizeChange && totalDealsCount > 0 ? (
        <PipelineTablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalDealsCount}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={loading}
        />
      ) : (
        !loading && deals.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <b className="text-slate-800 dark:text-slate-200 font-semibold">{deals.length}</b> of{' '}
              <b className="text-slate-800 dark:text-slate-200 font-semibold">{totalDealsCount}</b> deals
              {pipelineName && ` · ${pipelineName}`}
            </span>
          </div>
        )
      )}
    </div>
  );
}
