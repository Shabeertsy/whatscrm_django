import React, { useEffect, useState } from "react";
import PageHeader from "../../components/shared/PageHeader";
import { whatsappApi } from "../../api/whatsapp";
import { TemplateSync } from "./components/TemplateSync";
import { TemplateList } from "./components/TemplateList";
import { TemplateForm } from "./components/TemplateForm";
import { Plus } from "lucide-react";

export function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");

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

  const handleDelete = async (id: string) => {
    try {
      await whatsappApi.deleteTemplate(id);
      await fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Message Templates"
          description="Create, sync, and manage your WhatsApp Business templates."
        />
        <button
          onClick={() => {
            setEditingTemplate(null);
            setIsFormOpen(true);
          }}
          disabled={instances.length === 0}
          className="flex items-center gap-2 bg-[#007e3a] hover:bg-[#00602d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      <TemplateSync 
        instances={instances} 
        loading={loading} 
        syncingId={syncingId} 
        onSync={handleSync} 
      />

      <TemplateList 
        templates={templates} 
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
        onDelete={handleDelete}
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
    </div>
  );
}

export default Templates;
