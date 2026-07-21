import React, { useState } from "react";
import PageHeader from "../../components/shared/PageHeader";
import KanbanBoard from "./KanbanBoard";
import { Plus } from "lucide-react";
import { usePipeline } from "./hooks/usePipeline";
import { AddDealModal } from "./components/AddDealModal";
import { CreatePipelineModal } from "./components/CreatePipelineModal";
import { ManagePipelinesModal } from "./components/ManagePipelinesModal";
import { PipelineSwitcher, PipelineInfoBar } from "./components/PipelineSwitcher";
import { Pipeline as PipelineType, Deal } from "./api";



export function Pipeline() {
  const {
    pipelines,
    activePipeline,
    deals,
    contacts,
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
  } = usePipeline();

  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showCreatePipelineModal, setShowCreatePipelineModal] = useState(false);
  const [showPipelineSettingsModal, setShowPipelineSettingsModal] = useState(false);

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="CRM Deal Pipeline"
        description="Track lead conversions, deals value, and sales pipelines."
      >
        <PipelineSwitcher
          pipelines={pipelines}
          activePipeline={activePipeline}
          onSwitch={handleSwitchPipeline}
          onCreateNew={() => setShowCreatePipelineModal(true)}
          onManage={() => setShowPipelineSettingsModal(true)}
        />
        <button
          onClick={() => {
            const title = prompt("Enter new Stage Title:");
            if (title) handleAddStage(title);
          }}
          className="px-4 py-2 border border-[#007e3a] text-[#007e3a] hover:bg-[#007e3a]/5 text-xs font-bold rounded-lg transition duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Stage</span>
        </button>
        <button
          onClick={() => setShowAddDealModal(true)}
          className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg shadow-md transition duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Deal</span>
        </button>
      </PageHeader>

      {/* Active Pipeline Info Bar */}
      {activePipeline && (
        <PipelineInfoBar
          activePipeline={activePipeline}
          onToggleAutoCreate={handleToggleAutoCreate}
          onActivate={handleActivatePipeline}
        />
      )}

      {/* Kanban board fills remaining height — horizontal scroll handled inside KanbanBoard */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          stages={activePipeline?.stages || []}
          deals={deals}
          onMoveDeal={handleMoveDeal}
          onEditDeal={(deal) => setEditingDeal(deal)}
          onUpdateStage={handleUpdateStage}
          onSwapStages={handleSwapStages}
          onDeleteStage={handleDeleteStage}
        />
      </div>

      {(showAddDealModal || editingDeal) && (
        <AddDealModal
          contacts={contacts}
          initialData={editingDeal || undefined}
          onClose={() => {
            setShowAddDealModal(false);
            setEditingDeal(null);
          }}
          onSubmit={handleSaveDeal}
          onDelete={
            editingDeal 
              ? async () => { 
                  const success = await handleDeleteDeal(editingDeal.id);
                  if (success) {
                    setShowAddDealModal(false);
                    setEditingDeal(null);
                  }
                } 
              : undefined
          }
        />
      )}

      {showCreatePipelineModal && (
        <CreatePipelineModal
          onClose={() => setShowCreatePipelineModal(false)}
          onSubmit={handleCreatePipeline}
        />
      )}

      {showPipelineSettingsModal && (
        <ManagePipelinesModal
          pipelines={pipelines}
          onClose={() => setShowPipelineSettingsModal(false)}
          onActivate={handleActivatePipeline}
          onDelete={handleDeletePipeline}
          onUpdate={handleUpdatePipeline}
          onCreateNew={() => {
            setShowCreatePipelineModal(true);
            setShowPipelineSettingsModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Pipeline;
