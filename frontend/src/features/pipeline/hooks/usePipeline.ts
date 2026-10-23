import { useState, useEffect } from "react";
import {
  getPipelines, createPipeline, updatePipeline, deletePipeline,
  activatePipeline, createStage, getDeals, createDeal, updateDeal, deleteDeal,
  updateStage, deleteStage, swapStages,
  Pipeline, Deal, PipelineStage, StageField, PipelineField,
} from "../api";
import { apiClient } from "../../../api/client";
import toast from "react-hot-toast";



const getErrorMsg = (err: any, fallback: string) => {
  if (err?.response?.data) {
    if (typeof err.response.data === 'string') return err.response.data;
    if (err.response.data.detail) return err.response.data.detail;
    if (typeof err.response.data === 'object') {
      const messages = Object.entries(err.response.data)
        .map(([key, value]) => {
          const valStr = Array.isArray(value) ? value.join(' ') : String(value);
          // Capitalize key nicely
          const niceKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          return `${niceKey}: ${valStr}`;
        });
      if (messages.length > 0) return messages.join(', ');
    }
  }
  return err?.message || fallback;
};



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

  const handleCreatePipeline = async (data: { name: string; description: string; extra_fields?: PipelineField[] }): Promise<boolean> => {
    if (!data.name.trim()) { toast.error("Pipeline name is required"); return false; }
    try {
      const pipeline = await createPipeline(data);
      setPipelines(prev => [...prev, pipeline]);
      setActivePipeline(pipeline);
      setDeals([]);
      toast.success(`Pipeline "${pipeline.name}" created!`);
      return true;
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to create pipeline"));
      return false;
    }
  };

  const handleUpdatePipeline = async (id: string, data: Partial<Pipeline>): Promise<boolean> => {
    if (data.name !== undefined && !data.name.trim()) { toast.error("Pipeline name is required"); return false; }
    try {
      const updated = await updatePipeline(id, data);
      setPipelines(prev => prev.map(p => (p.id === id ? updated : p)));
      if (activePipeline?.id === id) {
        setActivePipeline(updated);
      }
      toast.success(`Pipeline updated!`);
      return true;
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to update pipeline"));
      return false;
    }
  };

  const handleAddStage = async (title: string, color?: string, isConfirmed?: boolean) => {
    if (!activePipeline || !title) return;
    try {
      const stage = await createStage(activePipeline.id, {
        title,
        color,
        order: (activePipeline.stages?.length || 0) + 1,
        is_confirmed: isConfirmed || false,
      });
      const updatedStages = [...(activePipeline.stages || []), stage];
      setActivePipeline(prev => prev ? { ...prev, stages: updatedStages } : prev);
      setPipelines(prev =>
        prev.map(p => p.id === activePipeline.id ? { ...p, stages: updatedStages } : p)
      );
      toast.success("Stage created!");
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to create stage"));
    }
  };

  const handleUpdateStage = async (stageId: string, data: Partial<PipelineStage>) => {
    if (!activePipeline) return;
    try {
      const updated = await updateStage(stageId, data);
      const updatedStages = (activePipeline.stages || [])
        .map(s => s.id === stageId ? updated : s)
        .sort((a, b) => a.order - b.order);

      setActivePipeline(prev => prev ? { ...prev, stages: updatedStages } : prev);
      setPipelines(prev =>
        prev.map(p => (p.id === activePipeline.id ? { ...p, stages: updatedStages } : p))
      );
      if (data.is_confirmed !== undefined) {
        const minConfirmed = updatedStages
          .filter(s => s.is_confirmed)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

        setDeals(prev =>
          prev.map(d => {
            const st = updatedStages.find(s => s.id === d.stage);
            const isConfirmed = st
              ? (st.is_confirmed || Boolean(minConfirmed && (st.order ?? 0) >= (minConfirmed.order ?? 0)))
              : d.is_confirmed_booking;
            return { ...d, is_confirmed_booking: !!isConfirmed };
          })
        );
      }
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to update stage"));
    }
  };

  // Swap orders of two stages 
  const handleSwapStages = async (stageAId: string, stageBId: string) => {
    if (!activePipeline) return;
    try {
      const { stage_a, stage_b } = await swapStages(stageAId, stageBId);
      const apply = (stages: PipelineStage[]) =>
        stages
          .map(s => s.id === stageAId ? stage_a : s.id === stageBId ? stage_b : s)
          .sort((a, b) => a.order - b.order);
      const newStages = apply(activePipeline.stages || []);
      setActivePipeline(prev => prev ? { ...prev, stages: newStages } : prev);
      setPipelines(prev => prev.map(p =>
        p.id === activePipeline.id ? { ...p, stages: apply(p.stages || []) } : p
      ));

      const minConfirmed = newStages
        .filter(s => s.is_confirmed)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

      setDeals(prev =>
        prev.map(d => {
          const st = newStages.find(s => String(s.id) === String(d.stage));
          const isConfirmed = st
            ? (Boolean(st.is_confirmed) || Boolean(minConfirmed && (st.order ?? 0) >= (minConfirmed.order ?? 0)))
            : d.is_confirmed_booking;
          return { ...d, is_confirmed_booking: !!isConfirmed };
        })
      );
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to reorder stages"));
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!activePipeline) return;
    if (!confirm("Are you sure you want to delete this stage? Deals in this stage will not be deleted but may become unassigned.")) return;

    try {
      // Backend deletes the stage, renormalizes remaining orders, and returns them
      const renormalizedStages = await deleteStage(stageId);
      setActivePipeline(prev => prev ? { ...prev, stages: renormalizedStages } : prev);
      setPipelines(prev =>
        prev.map(p => p.id === activePipeline.id ? { ...p, stages: renormalizedStages } : p)
      );

      const minConfirmed = renormalizedStages
        .filter(s => s.is_confirmed)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

      setDeals(prev =>
        prev.map(d => {
          const st = renormalizedStages.find(s => String(s.id) === String(d.stage));
          const isConfirmed = st
            ? (Boolean(st.is_confirmed) || Boolean(minConfirmed && (st.order ?? 0) >= (minConfirmed.order ?? 0)))
            : d.is_confirmed_booking;
          return { ...d, is_confirmed_booking: !!isConfirmed };
        })
      );
      toast.success("Stage deleted!");
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to delete stage"));
    }
  };

  const handleMoveDeal = async (id: string, nextStage: string) => {
    const prevDeals = [...deals];
    const targetStage = activePipeline?.stages?.find(s => String(s.id) === String(nextStage));
    const stages = activePipeline?.stages || [];
    const minConfirmedStage = stages
      .filter(s => s.is_confirmed)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

    const isConfirmedTarget = targetStage
      ? (Boolean(targetStage.is_confirmed) || Boolean(minConfirmedStage && (targetStage.order ?? 0) >= (minConfirmedStage.order ?? 0)))
      : false;

    setDeals(prev =>
      prev.map(d => {
        if (d.id !== id) return d;
        return {
          ...d,
          stage: nextStage,
          is_confirmed_booking: isConfirmedTarget,
        };
      })
    );
    try {
      const updated = await updateDeal(id, { stage: nextStage });
      setDeals(prev => prev.map(d => (d.id === id ? { ...d, ...updated } : d)));
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to move deal"));
      setDeals(prevDeals);
    }
  };

  const handleSaveDeal = async (data: {
    id?: string; name: string; value: number; wa_contact?: string | null; manual_contact?: string | null; note?: string | null; extra_data?: Record<string, any>; stage?: string;
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
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to save deal"));
      return false;
    }
  };

  const handleDeleteDeal = async (id: string): Promise<boolean> => {
    try {
      await deleteDeal(id);
      setDeals(prev => prev.filter(d => d.id !== id));
      toast.success("Deal deleted!");
      return true;
    } catch (err: any) {
      toast.error(getErrorMsg(err, "Failed to delete deal"));
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
    handleUpdateStage,
    handleSwapStages,
    handleDeleteStage,
    handleMoveDeal,
    handleSaveDeal,
    handleDeleteDeal,
  };
}
