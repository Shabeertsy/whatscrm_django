import React, { useEffect, useState } from "react";
import PageHeader from "../../components/shared/PageHeader";
import { whatsappApi } from "../../api/whatsapp";
import { TemplateSync } from "./components/TemplateSync";
import { TemplateList } from "./components/TemplateList";
import { TemplateForm } from "./components/TemplateForm";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { Plus, Smartphone, ChevronDown } from "lucide-react";

export function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [lineFilter, setLineFilter] = useState<string>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'regular' | 'campaign'>('regular');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tplRes, instRes] = await Promise.all([
        whatsappApi.listTemplates(),
        whatsappApi.listInstances()
      ]);
      setTemplates(Array.isArray(tplRes.data) ? tplRes.data : (tplRes.data as any).results || []);
      setInstances(Array.isArray(instRes.data) ? instRes.data : (instRes.data as any).results || []);
      
      const loadedInstances = Array.isArray(instRes.data) ? instRes.data : (instRes.data as any).results || [];
      if (loadedInstances.length > 0 && !selectedInstanceId) {
        setSelectedInstanceId(loadedInstances[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (instanceId: string) => {
    setSyncingId(instanceId);
    try {
      const res = await whatsappApi.syncTemplates(instanceId);
      alert(`Synced ${res.data.synced} new templates (Total: ${res.data.total})`);
      await fetchData();
    } catch (e: any) {
      alert(`Sync failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    const activeInstances = instances.filter(i => i.is_active);
    if (activeInstances.length === 0) return;
    setIsSyncingAll(true);
    let totalSynced = 0;
    let totalTemplates = 0;
    try {
      for (const inst of activeInstances) {
        setSyncingId(inst.id);
        const res = await whatsappApi.syncTemplates(inst.id);
        totalSynced += (res.data?.synced || 0);
        totalTemplates += (res.data?.total || 0);
      }
      alert(`Synced ${totalSynced} new templates across all lines (Total: ${totalTemplates})`);
      await fetchData();
    } catch (e: any) {
      alert(`Sync failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSyncingId(null);
      setIsSyncingAll(false);
    }
  };

  const handleCreateSubmit = async (payload: any) => {
    await whatsappApi.createTemplate(payload);
    await fetchData();
  };

  const handleEditSubmit = async (payload: any) => {
    if (!editingTemplate) return;
    await whatsappApi.updateTemplate(editingTemplate.id, payload);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await whatsappApi.deleteTemplate(deleteTargetId);
      await fetchData();
      setDeleteTargetId(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const regularTemplates = templates.filter(t => t.template_type === 'REGULAR' || (!t.template_type && t.category !== 'MARKETING'));
  const campaignTemplates = templates.filter(t => t.template_type === 'CAMPAIGN' || (!t.template_type && t.category === 'MARKETING'));
  const byTab = activeTab === 'regular' ? regularTemplates : campaignTemplates;
  const displayedTemplates = lineFilter === 'all' ? byTab : byTab.filter(t => String(t.instance) === String(lineFilter));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Templates"
        description="Create, sync, and manage your WhatsApp Business templates."
      >
        <TemplateSync 
          instances={instances} 
          loading={loading} 
          syncingId={syncingId} 
          isSyncingAll={isSyncingAll}
          onSync={handleSync} 
          onSyncAll={handleSyncAll}
        />
        <button
          onClick={() => {
            setEditingTemplate(null);
            setIsFormOpen(true);
          }}
          disabled={instances.length === 0}
          className="flex items-center gap-2 bg-[#007e3a] hover:bg-[#00602d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </PageHeader>

      {/* Tabs & Instance Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 gap-2 pb-2 sm:pb-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('regular')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'regular'
                ? 'border-[#007e3a] text-[#007e3a]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Regular Templates
          </button>
          <button
            onClick={() => setActiveTab('campaign')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'campaign'
                ? 'border-[#007e3a] text-[#007e3a]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Campaign Templates
          </button>
        </div>

        {instances.length > 1 && (
          <div className="relative inline-flex items-center pb-1 sm:pb-0">
            <Smartphone className={`h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              lineFilter !== 'all' ? 'text-[#007e3a] dark:text-emerald-400' : 'text-slate-400'
            }`} />
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className={`h-8 pl-8 pr-7 text-xs font-medium rounded-lg border appearance-none outline-none cursor-pointer transition-all shadow-xs ${
                lineFilter !== 'all'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#007e3a]/60 text-[#007e3a] dark:text-emerald-400 font-semibold'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              title="Filter templates by WhatsApp Line"
            >
              <option value="all">All Lines ({instances.length})</option>
              {instances.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.display_name}</option>
              ))}
            </select>
            <ChevronDown className={`h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              lineFilter !== 'all' ? 'text-[#007e3a] dark:text-emerald-400' : 'text-slate-400'
            }`} />
          </div>
        )}
      </div>

      <TemplateList 
        templates={displayedTemplates} 
        instances={instances}
        loading={loading} 
        onEdit={(tmpl) => {
          setEditingTemplate(tmpl);
          setIsFormOpen(true);
        }}
        onDuplicate={(tmpl) => {
          setEditingTemplate({
            ...tmpl,
            id: undefined,
            name: `${tmpl.name}_copy`
          });
          setIsFormOpen(true);
        }}
        onDelete={setDeleteTargetId}
      />

      {isFormOpen && (
        <TemplateForm
          initialData={editingTemplate}
          instanceId={editingTemplate?.instance || selectedInstanceId}
          instances={instances}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTemplate(null);
          }}
          onSubmit={editingTemplate?.id ? handleEditSubmit : handleCreateSubmit}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Template"
        description="Are you sure you want to delete this template from Meta? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default Templates;
