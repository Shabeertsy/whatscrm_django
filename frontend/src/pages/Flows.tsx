import React, { useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { Plus, Loader2, Layers } from "lucide-react";
import { FlowCard } from "../features/flows/components/FlowCard";
import { CreateFlowModal } from "../features/flows/components/CreateFlowModal";
import { ViewFlowModal } from "../features/flows/components/ViewFlowModal";
import { useFlows } from "../features/flows/hooks/useFlows";



export default function Flows() {
  const { 
    flows, instances, loading, publishingId, deletingId, fetchFlowsData, getFlowDetails, 
    confirmState, closeConfirm, handleDelete, handlePublish 
  } = useFlows();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewFlow, setViewFlow] = useState<any | null>(null);
  const [initialCloneFlow, setInitialCloneFlow] = useState<any | null>(null);

  const handleViewFlow = async (id: string) => {
    try {
      const data = await getFlowDetails(id);
      setViewFlow(data);
    } catch (e) { console.error("Failed to load flow details", e); }
  };

  const handleDuplicate = async (id: string, e: any) => {
    e.stopPropagation();
    try {
      const data = await getFlowDetails(id);
      setInitialCloneFlow(data);
      setIsFormOpen(true);
    } catch (e) { 
      console.error("Failed to clone flow details", e);
      alert("Failed to load flow details for duplication.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp Flows" description="Create and manage WhatsApp interactive flows.">
        <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#007e3a] text-white rounded-lg hover:bg-[#00662e] transition-colors shadow-sm text-sm font-medium">
          <Plus className="h-4 w-4" /> Create Flow
        </button>
      </PageHeader>

      {/* Flow list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-[#007e3a]" />
        </div>
      ) : flows.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {flows.map(flow => (
            <FlowCard
              key={flow.id}
              flow={flow}
              isPublishing={publishingId === flow.id}
              isDeleting={deletingId === flow.id}
              onDelete={(e) => handleDelete(flow.id, e)}
              onPublish={(e) => handlePublish(flow.id, e)}
              onDuplicate={(e) => handleDuplicate(flow.id, e)}
              onClick={() => handleViewFlow(flow.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No flows yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center max-w-xs">
            Create your first WhatsApp interactive flow to get started.
          </p>
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] text-white rounded-lg hover:bg-[#00662e] transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Flow
          </button>
        </div>
      )}

      {/* Create Modal */}
      {isFormOpen && (
        <CreateFlowModal
          instances={instances}
          initialFlow={initialCloneFlow}
          onClose={() => { setIsFormOpen(false); setInitialCloneFlow(null); }}
          onSuccess={() => { setIsFormOpen(false); setInitialCloneFlow(null); fetchFlowsData(); }}
        />
      )}

      {/* View Modal */}
      <ViewFlowModal
        viewFlow={viewFlow}
        onClose={() => setViewFlow(null)}
      />

      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        isDestructive={confirmState.isDestructive}
        confirmLabel={confirmState.isDestructive ? "Delete" : "Publish"}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
