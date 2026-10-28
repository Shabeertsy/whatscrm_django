import React from 'react';
import { PipelineTableStatsData } from '../types';

interface PipelineTableStatsProps {
  stats: PipelineTableStatsData;
  loading: boolean;
}


export function PipelineTableStats({ stats, loading }: PipelineTableStatsProps) {
  if (loading) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Total Deals
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          {stats.totalDeals}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Pipeline Value
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          ₹{stats.totalValue.toLocaleString('en-IN')}
        </p>
      </div>


      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Confirmed
        </p>
        <p className="text-2xl font-bold text-[#007e3a] dark:text-[#00b355] mt-1">
          {stats.confirmedCount}
        </p>
      </div>
    </div>
  );
}
