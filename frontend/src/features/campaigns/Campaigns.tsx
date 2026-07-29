import React, { useState, useEffect } from "react";
import PageHeader from "../../components/shared/PageHeader";
import CampaignList from "./components/CampaignList";
import CampaignWizard, { CampaignDataPayload } from "./components/CampaignWizard";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { Campaign, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign, launchCampaign, stopCampaign } from "./api";
import { Plus, Megaphone, Send, CheckCircle2, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";



export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (error) {
      toast.error("Failed to load campaigns.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCampaign = async (payload: CampaignDataPayload, campaignId?: string) => {
    try {
      if (campaignId) {
        const updated = await updateCampaign(campaignId, payload);
        setCampaigns(campaigns.map(c => c.id === campaignId ? updated : c));
        toast.success("Campaign updated successfully.");
      } else {
        const newCamp = await createCampaign({
          ...payload,
          status: "Draft",
        });
        setCampaigns([newCamp, ...campaigns]);
        toast.success("Campaign drafted successfully.");
      }
      setIsWizardOpen(false);
      setEditingCampaign(null);
    } catch (error) {
      toast.error(campaignId ? "Failed to update campaign." : "Failed to create campaign.");
    }
  };

  const handleLaunchDirect = async (id: string) => {
    try {
      const updated = await launchCampaign(id);
      setCampaigns(campaigns.map(c => c.id === id ? updated : c));
      toast.success("Campaign launched successfully!");
    } catch (error) {
      toast.error("Failed to launch campaign.");
    }
  };

  const handleStopCampaign = async (id: string) => {
    try {
      const updated = await stopCampaign(id);
      setCampaigns(campaigns.map(c => c.id === id ? updated : c));
      toast.success("Campaign stopped successfully.");
    } catch (error) {
      toast.error("Failed to stop campaign.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteCampaign(deleteTargetId);
      setCampaigns(campaigns.filter(c => c.id !== deleteTargetId));
      toast.success("Campaign deleted successfully.");
      setDeleteTargetId(null);
    } catch (error) {
      toast.error("Failed to delete campaign.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setIsWizardOpen(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsWizardOpen(true);
  };

  // Metrics calculation
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === "Running").length;
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered || 0), 0);
  const avgReadRate = totalDelivered > 0
    ? Math.round((campaigns.reduce((acc, c) => acc + (c.read || 0), 0) / totalDelivered) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <PageHeader
          title="Broadcast Campaigns"
          description="Launch marketing templates"
        />
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-[#007e3a] to-[#00a84e] hover:from-[#00602d] hover:to-[#008f42] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="h-5 w-5" />
          <span>Launch Campaign</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#007e3a] flex items-center justify-center">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Campaigns</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalCampaigns}</h4>
          </div>
        </div>

        <div className="bg-[#ffffff] dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Broadcasts</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeCampaigns}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Delivered Messages</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalDelivered.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Avg. Read Rate</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{avgReadRate}%</h4>
          </div>
        </div>
      </div>

      <div className="w-full">
        <CampaignList
          campaigns={campaigns}
          isLoading={isLoading}
          onEdit={openEditModal}
          onDelete={(id) => setDeleteTargetId(id)}
          onLaunch={handleLaunchDirect}
          onStop={handleStopCampaign}
        />
      </div>

      <CampaignWizard
        initialData={editingCampaign}
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingCampaign(null);
        }}
        onLaunch={handleSaveCampaign}
      />

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Campaign"
        description="Are you sure you want to delete this broadcast campaign? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default Campaigns;
