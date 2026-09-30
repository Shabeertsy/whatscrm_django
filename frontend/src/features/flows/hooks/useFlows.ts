import { useState, useEffect } from "react";
import { flowsApi } from "../../../api/flows";
import { whatsappApi } from "../../../api/whatsapp";


export function useFlows() {
  const [flows, setFlows] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFlowsData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [flowsRes, instRes] = await Promise.all([flowsApi.listFlows(), whatsappApi.listInstances()]);
      setFlows(Array.isArray(flowsRes.data) ? flowsRes.data : (flowsRes.data as any).results || []);
      const loaded = Array.isArray(instRes.data) ? instRes.data : (instRes.data as any).results || [];
      setInstances(loaded);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowsData();
  }, []);

  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; description: string;
    isDestructive?: boolean; onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => { } });

  const closeConfirm = () => setConfirmState(s => ({ ...s, open: false }));

  const deleteFlow = async (id: string) => {
    setDeletingId(id);
    try {
      await flowsApi.deleteFlow(id);
      await fetchFlowsData(false);
    } finally {
      setDeletingId(null);
    }
  };

  const publishFlow = async (id: string) => {
    setPublishingId(id);
    try {
      await flowsApi.uploadJson(id);
      await flowsApi.publishFlow(id);
      await fetchFlowsData(false);
    } finally {
      setPublishingId(null);
    }
  };

  const getFlowDetails = async (id: string) => {
    const res = await flowsApi.getFlow(id);
    return res.data;
  };

  const handleDelete = (id: string, e: any) => {
    e.stopPropagation();
    setConfirmState({
      open: true,
      title: "Delete Flow",
      description: "This flow will be permanently deleted. This action cannot be undone.",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        try { await deleteFlow(id); }
        catch (err: any) { alert(`Failed to delete: ${err.response?.data?.error || err.message}`); }
      },
    });
  };

  const handlePublish = (id: string, e: any) => {
    e.stopPropagation();
    setConfirmState({
      open: true,
      title: "Publish to Meta",
      description: "Once published, this flow will go live on WhatsApp and cannot be reverted to draft.",
      isDestructive: false,
      onConfirm: async () => {
        closeConfirm();
        try { await publishFlow(id); }
        catch (err: any) { alert(`Failed to publish: ${err.response?.data?.error || err.message}`); }
      },
    });
  };

  return {
    flows,
    instances,
    loading,
    publishingId,
    deletingId,
    fetchFlowsData,
    getFlowDetails,
    confirmState,
    closeConfirm,
    handleDelete,
    handlePublish,
  };
}
