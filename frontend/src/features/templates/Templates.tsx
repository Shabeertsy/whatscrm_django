import React, { useEffect, useState } from "react";
import PageHeader from "../../components/shared/PageHeader";
import { whatsappApi } from "../../api/whatsapp";
import { TemplateSync } from "./components/TemplateSync";
import { TemplateList } from "./components/TemplateList";
import { TemplateForm } from "./components/TemplateForm";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { Plus } from "lucide-react";

export function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

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
  const displayedTemplates = activeTab === 'regular' ? regularTemplates : campaignTemplates;

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
          onSync={handleSync} 
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
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

      <TemplateList 
        templates={displayedTemplates} 
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
