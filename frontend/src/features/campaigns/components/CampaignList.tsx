import React from "react";
import { Link } from "react-router-dom";
import DataTable from "../../../components/shared/DataTable";
import { Campaign } from "../api";
import { Megaphone, Play, Pause, Square, CheckCircle2, Clock, Eye, MessageCircle, Send, Edit2, Trash2, Calendar, Users } from "lucide-react";

interface CampaignListProps {
  campaigns: Campaign[];
  isLoading?: boolean;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onLaunch?: (id: string) => void;
  onStop?: (id: string) => void;
}

export function CampaignList({ campaigns, isLoading, onEdit, onDelete, onLaunch, onStop }: CampaignListProps) {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const columns = [
    {
      header: "Campaign Name",
      accessor: (c: Campaign) => {
        const isSpecific = c.target_type === "specific";
        const contactCount = c.contacts?.length || 0;
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-xl bg-[#007e3a]/10 border border-[#007e3a]/20 flex items-center justify-center text-[#007e3a] shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block truncate">{c.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  {c.template_name ? `Template: ${c.template_name}` : "Broadcast Campaign"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#007e3a] bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  <Users className="h-2.5 w-2.5" />
                  {isSpecific ? `${contactCount} Specific Contact${contactCount === 1 ? '' : 's'}` : "All Contacts"}
                </span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Schedule Range",
      accessor: (c: Campaign) => {
        const start = formatDate(c.start_date);
        const end = formatDate(c.end_date);
        const frequency = c.frequency || "once";

        const formatFreq = (freq: string) => {
          if (freq === "once") return "One-time";
          if (freq === "custom") return `Every ${c.custom_days_gap || 1} day(s)`;
          return freq.charAt(0).toUpperCase() + freq.slice(1);
        };

        if (!start && !end) {
          return (
            <div className="flex flex-col gap-1 mt-0.5">
              <span className="text-xs text-slate-400 font-medium italic">Immediate</span>
              <span className="text-[10px] text-[#007e3a] font-semibold bg-[#007e3a]/10 px-1.5 py-0.5 rounded w-fit">
                {formatFreq(frequency)}
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col text-xs text-slate-700 dark:text-slate-300 font-medium gap-1 mt-0.5">
            <div>
              {start && <span className="flex items-center gap-1"><span className="text-slate-400 text-[10px]">Start:</span> {start}</span>}
              {end && <span className="flex items-center gap-1"><span className="text-slate-400 text-[10px]">End:</span> {end}</span>}
            </div>
            <span className="text-[10px] text-[#007e3a] font-semibold bg-[#007e3a]/10 px-1.5 py-0.5 rounded w-fit">
              {formatFreq(frequency)}
            </span>
          </div>
        );
      }
    },
    {
      header: "Status",
      accessor: (c: Campaign) => {
        const isRunning = c.status === "Running";
        const isCompleted = c.status === "Completed";
        const isPaused = c.status === "Paused";

        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isRunning
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50"
              : isCompleted
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/50"
                : isPaused
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/50"
                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}
          >
            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
            {isCompleted && <CheckCircle2 className="h-3 w-3 text-blue-500" />}
            {isPaused && <Pause className="h-3 w-3 text-amber-500" />}
            {!isRunning && !isCompleted && !isPaused && <Clock className="h-3 w-3 text-slate-400" />}
            {c.status}
          </span>
        );
      }
    },
    {
      header: "Sent / Delivered",
      accessor: (c: Campaign) => (
        <div className="text-right">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
            {(c.delivered || 0).toLocaleString()} / {(c.sent || 0).toLocaleString()}
          </span>
        </div>
      ),
      className: "text-right"
    },
    {
      header: "Read Rate",
      className: "text-right min-w-[130px]",
      accessor: (c: Campaign) => {
        const rate = c.delivered > 0 ? Math.round((c.read / c.delivered) * 100) : 0;
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Eye className="h-3 w-3 text-purple-500 inline" /> {rate}%
            </span>
            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${rate}%` }}></div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Reply Rate",
      className: "text-right min-w-[130px]",
      accessor: (c: Campaign) => {
        const rate = c.delivered > 0 ? Math.round((c.replied / c.delivered) * 100) : 0;
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-emerald-500 inline" /> {rate}%
            </span>
            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${rate}%` }}></div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Actions",
      className: "text-right min-w-[100px]",
      accessor: (c: Campaign) => {
        const statusLower = (c.status || "").toLowerCase();
        const isRunning = statusLower === "running";
        const isPaused = statusLower === "paused";
        const isDraft = statusLower === "draft";

        return (
          <div className="flex items-center justify-end gap-1">
            {isRunning && onStop && (
              <button
                onClick={() => onStop(c.id)}
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Stop Campaign"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            )}
            {(isDraft || isPaused) && onLaunch && (
              <button
                onClick={() => onLaunch(c.id)}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                title={isPaused ? "Resume Campaign" : "Launch Broadcast"}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
              </button>
            )}
            <Link
              to={`/campaigns/${c.id}`}
              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => onEdit(c)}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit Campaign"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(c.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
              title="Delete Campaign"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-md mx-auto my-8">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#007e3a]">
          <Megaphone className="h-7 w-7" />
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No campaigns launched yet</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Create and broadcast your first marketing campaign to targeted contacts.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <DataTable
        columns={columns}
        data={campaigns}
        keyExtractor={(c) => c.id}
      />
    </div>
  );
}

export default CampaignList;
