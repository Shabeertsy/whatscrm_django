import { useState, useEffect } from "react";
import {
  getPipelines, createPipeline, updatePipeline, deletePipeline,
  activatePipeline, createStage, getDeals, createDeal, updateDeal,
  Pipeline, Deal,
} from "../api";
import { apiClient } from "../../../api/client";
import toast from "react-hot-toast";

export function usePipeline() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPipelines();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (activePipeline) {
      fetchDeals(activePipeline.id);
    }
  }, [activePipeline?.id]);

  const fetchPipelines = async () => {
    try {
      setIsLoading(true);
      const data = await getPipelines();
      setPipelines(data);
      const active = data.find(p => p.is_active) || data[0] || null;
      setActivePipeline(active);
    } catch {
      toast.error("Failed to load pipelines");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeals = async (pipelineId: string) => {
    try {
      const data = await getDeals(pipelineId);
      setDeals(data);
    } catch {
      toast.error("Failed to load deals");
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await apiClient.get('/messaging/contacts/');
      setContacts(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to load contacts", err);
    }
  };

  const handleSwitchPipeline = async (pipeline: Pipeline) => {
    setActivePipeline(pipeline);
    fetchDeals(pipeline.id);
  };

  const handleActivatePipeline = async (pipelineId: string) => {
    try {
      const updated = await activatePipeline(pipelineId);
      setPipelines(prev => prev.map(p => ({
        ...p,
        is_active: p.id === pipelineId,
        auto_create_deals: p.id === pipelineId ? p.auto_create_deals : false,
      })));
      setActivePipeline(prev =>
        prev?.id === pipelineId ? { ...prev, is_active: true } : prev
      );
      toast.success(`"${updated.name}" is now the active pipeline`);
    } catch {
      toast.error("Failed to activate pipeline");
    }
  };

  const handleToggleAutoCreate = async () => {
    if (!activePipeline) return;
    if (!activePipeline.is_active) {
      toast.error("Only the active pipeline can have auto-create enabled.");
      return;
    }
    try {
      const updated = await updatePipeline(activePipeline.id, {
        auto_create_deals: !activePipeline.auto_create_deals,
      });
      setActivePipeline(updated);
      setPipelines(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      toast.success(
        updated.auto_create_deals
          ? "Auto-create deals enabled — new messages will create deals automatically"
          : "Auto-create deals disabled"
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update setting");
    }
  };

  const handleDeletePipeline = async (pipeline: Pipeline): Promise<boolean> => {
    if (pipeline.is_active) {
      toast.error("Cannot delete the active pipeline. Activate another one first.");
      return false;
    }
    if (!confirm(`Delete pipeline "${pipeline.name}"? All its deals and stages will be removed.`)) return false;
    try {
      await deletePipeline(pipeline.id);
      const updated = pipelines.filter(p => p.id !== pipeline.id);
      setPipelines(updated);
      if (activePipeline?.id === pipeline.id) {
        setActivePipeline(updated[0] || null);
      }
      toast.success("Pipeline deleted");
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete pipeline");
      return false;
    }
  };

  const handleCreatePipeline = async (data: { name: string; description: string }): Promise<boolean> => {
    if (!data.name.trim()) { toast.error("Pipeline name is required"); return false; }
    try {
      const pipeline = await createPipeline(data);
      setPipelines(prev => [...prev, pipeline]);
      toast.success(`Pipeline "${pipeline.name}" created!`);
      return true;
    } catch {
      toast.error("Failed to create pipeline");
      return false;
    }
  };

  const handleUpdatePipeline = async (id: string, data: { name: string; description: string }): Promise<boolean> => {
    if (!data.name.trim()) { toast.error("Pipeline name is required"); return false; }
    try {
      const updated = await updatePipeline(id, data);
      setPipelines(prev => prev.map(p => (p.id === id ? updated : p)));
      if (activePipeline?.id === id) {
        setActivePipeline(updated);
      }
      toast.success(`Pipeline updated!`);
      return true;
    } catch {
      toast.error("Failed to update pipeline");
      return false;
    }
  };

  const handleAddStage = async (title: string) => {
    if (!activePipeline || !title) return;
    try {
      const stage = await createStage(activePipeline.id, {
        title,
        order: (activePipeline.stages?.length || 0) + 1,
      });
      const updatedStages = [...(activePipeline.stages || []), stage];
      setActivePipeline(prev => prev ? { ...prev, stages: updatedStages } : prev);
      setPipelines(prev =>
        prev.map(p => p.id === activePipeline.id ? { ...p, stages: updatedStages } : p)
      );
      toast.success("Stage created!");
    } catch {
      toast.error("Failed to create stage");
    }
  };

  const handleMoveDeal = async (id: string, nextStage: string) => {
    const prevDeals = [...deals];
    setDeals(prev => prev.map(d => (d.id === id ? { ...d, stage: nextStage } : d)));
    try {
      await updateDeal(id, { stage: nextStage });
    } catch {
      toast.error("Failed to move deal");
      setDeals(prevDeals);
    }
  };

  const handleSaveDeal = async (data: {
    id?: string; name: string; value: number; wa_contact?: string | null; note?: string | null;
  }): Promise<boolean> => {
    if (!activePipeline) { toast.error("No active pipeline selected"); return false; }
    try {
      if (data.id) {
        const updatedDeal = await updateDeal(data.id, data);
        setDeals(prev => prev.map(d => (d.id === data.id ? updatedDeal : d)));
        toast.success("Deal updated!");
      } else {
        const deal = await createDeal({ ...data, pipeline: activePipeline.id });
        setDeals(prev => [...prev, deal]);
        toast.success("Deal created!");
      }
      return true;
    } catch {
      toast.error("Failed to save deal");
      return false;
    }
  };

  return {
    pipelines,
    activePipeline,
    deals,
    contacts,
    isLoading,
    handleSwitchPipeline,
    handleActivatePipeline,
    handleToggleAutoCreate,
    handleDeletePipeline,
    handleCreatePipeline,
    handleUpdatePipeline,
    handleAddStage,
    handleMoveDeal,
    handleSaveDeal,
  };
}
