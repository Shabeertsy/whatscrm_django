import React from 'react';
import { CheckCircle, TrendingUp, Building2 } from 'lucide-react';


interface ConfirmedBookingsStatsProps {
  loading: boolean;
  totalBookings: number;
  totalValue: number;
  pipelinesCount: number;
}


export function ConfirmedBookingsStats({
  loading,
  totalBookings,
  totalValue,
  pipelinesCount,
}: ConfirmedBookingsStatsProps) {
  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalBookings}</p>
          <p className="text-xs text-slate-500 font-medium">Confirmed Bookings</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{totalValue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-500 font-medium">Total Value</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {pipelinesCount}
          </p>
          <p className="text-xs text-slate-500 font-medium">Pipelines</p>
        </div>
      </div>
    </div>
  );
}
