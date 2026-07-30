import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, SkipForward, Trash2 } from "lucide-react";
import { Campaign, CampaignDelivery, fetchCampaign, fetchCampaignDeliveries, clearCampaignDeliveries } from "./api";
import PageHeader from "../../components/shared/PageHeader";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import toast from "react-hot-toast";

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliveries, setDeliveries] = useState<CampaignDelivery[]>([]);
  const [pagination, setPagination] = useState({ count: 0, next: null as string | null, previous: null as string | null, page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id, 1);
    }
  }, [id]);

  const loadData = async (campaignId: string, page: number, hideLoading = false) => {
    if (!hideLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [campData, delivData] = await Promise.all([
        fetchCampaign(campaignId),
        fetchCampaignDeliveries(campaignId, page)
      ]);
      
      setCampaign(campData);
      
      if (Array.isArray(delivData)) {
        setDeliveries(delivData);
        setPagination({
          count: delivData.length,
          next: null,
          previous: null,
          page: 1
        });
      } else {
        setDeliveries(delivData.results || []);
        setPagination({
          count: delivData.count || 0,
          next: delivData.next || null,
          previous: delivData.previous || null,
          page: page
        });
      }
    } catch (error) {
      toast.error("Failed to load campaign details.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (id) {
      loadData(id, pagination.page, true);
    }
  };

  const handleClearLogsClick = () => {
    setIsConfirmClearOpen(true);
  };

  const performClearLogs = async () => {
    if (!id) return;
    
    setIsClearing(true);
    try {
      await clearCampaignDeliveries(id);
      toast.success("Delivery logs cleared successfully.");
      loadData(id, 1, false);
      setIsConfirmClearOpen(false);
    } catch (error) {
      toast.error("Failed to clear delivery logs.");
    } finally {
      setIsClearing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (id) {
      loadData(id, newPage);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent": return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold"><CheckCircle2 className="h-3 w-3" /> Sent</span>;
      case "failed": return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold"><XCircle className="h-3 w-3" /> Failed</span>;
      case "skipped": return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold"><SkipForward className="h-3 w-3" /> Skipped</span>;
      default: return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md text-[11px] font-bold"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  if (isLoading && !campaign) {
    return <div className="flex justify-center p-12"><RefreshCw className="h-8 w-8 text-slate-300 animate-spin" /></div>;
  }

  if (!campaign) {
    return (
      <div className="text-center p-12">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900">Campaign Not Found</h3>
        <p className="text-slate-500 mt-2">The campaign you are looking for does not exist.</p>
        <Link to="/campaigns" className="text-emerald-600 font-bold mt-4 inline-block hover:underline">
          &larr; Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <Link to="/campaigns" className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          <PageHeader
            title={campaign.name}
            description={`Details and delivery report for this campaign`}
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Status</p>
          <h4 className="text-lg font-bold text-slate-900 mt-1">{campaign.status}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Messages Sent</p>
          <h4 className="text-lg font-bold text-emerald-600 mt-1">{campaign.sent.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Delivered</p>
          <h4 className="text-lg font-bold text-blue-600 mt-1">{campaign.delivered.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Read</p>
          <h4 className="text-lg font-bold text-purple-600 mt-1">{campaign.read.toLocaleString()}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delivery Log</h3>
            <p className="text-sm text-slate-500 font-medium">Total deliveries recorded: {pagination.count.toLocaleString()}</p>
          </div>
          <button
            onClick={handleClearLogsClick}
            disabled={isClearing || pagination.count === 0}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-rose-100"
          >
            <Trash2 className={`h-3.5 w-3.5 ${isClearing ? "animate-pulse" : ""}`} />
            <span>Clear Logs</span>
          </button>
        </div>
        <div className="overflow-x-auto always-show-scrollbar pb-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold text-xs">
              <tr>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Sent At</th>
                <th className="px-6 py-4">Run ID / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                    No delivery records found for this campaign yet.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {d.contact_details?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {d.contact_details?.phone || d.contact_details?.wa_id || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                      {d.sent_at ? new Date(d.sent_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {d.error ? (
                        <span className="text-rose-500 text-xs font-bold" title={d.error}>
                          {d.error}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {d.run_id}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">
            Page {pagination.page}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.previous || isRefreshing}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.next || isRefreshing}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        title="Clear Delivery Logs"
        description="Are you sure you want to clear all delivery logs? This will reset all campaign metrics to zero and delete all log records. This cannot be undone."
        confirmLabel="Clear Logs"
        cancelLabel="Cancel"
        onConfirm={performClearLogs}
        onCancel={() => setIsConfirmClearOpen(false)}
        isLoading={isClearing}
        isDestructive={true}
      />
    </div>
  );
}

export default CampaignDetail;
