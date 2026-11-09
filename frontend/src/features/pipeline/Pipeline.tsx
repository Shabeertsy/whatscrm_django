import React, { useState, useEffect } from "react";
import PageHeader from "../../components/shared/PageHeader";
import KanbanBoard from "./KanbanBoard";
import { Plus, Loader2, Smartphone, ChevronDown } from "lucide-react";
import { usePipeline } from "./hooks/usePipeline";
import { AddDealModal } from "./components/AddDealModal";
import { CreatePipelineModal } from "./components/CreatePipelineModal";
import { ManagePipelinesModal } from "./components/ManagePipelinesModal";
import { AddStageModal } from "./components/AddStageModal";
import { PipelineSwitcher, PipelineInfoBar } from "./components/PipelineSwitcher";
import { Pipeline as PipelineType, Deal, PipelineField } from "./api";
import { whatsappApi } from "../../api/whatsapp";



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
    instanceFilter,
    setInstanceFilter,
    isLoading,
  } = usePipeline();

  const [instances, setInstances] = useState<Array<{ id: string; display_name: string }>>([]);

  useEffect(() => {
    whatsappApi.listInstances().then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      setInstances(list.filter((i: any) => i.is_active));
    }).catch(console.error);
  }, []);

  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showCreatePipelineModal, setShowCreatePipelineModal] = useState(false);
  const [showPipelineSettingsModal, setShowPipelineSettingsModal] = useState(false);
  const [managePipelineInitialId, setManagePipelineInitialId] = useState<string | null>(null);
  const [showAddStageModal, setShowAddStageModal] = useState(false);

  const allActiveExtraFields = React.useMemo(() => {
    const map = new Map<string, PipelineField>();
    (activePipeline?.extra_fields || []).forEach(f => {
      if (f && f.key) map.set(f.key, f);
    });
    (activePipeline?.stages || []).forEach(s => {
      (s.extra_fields || []).forEach(f => {
        if (f && f.key && !map.has(f.key)) map.set(f.key, f);
      });
    });
    return Array.from(map.values());
  }, [activePipeline]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full gap-2">
      <PageHeader
        title="CRM Deal Pipeline"
        description="Track lead conversions, deals value, and sales pipelines."
      >
        <PipelineSwitcher
          pipelines={pipelines}
          activePipeline={activePipeline}
          onSwitch={handleSwitchPipeline}
          onCreateNew={() => setShowCreatePipelineModal(true)}
          onManage={() => {
            setManagePipelineInitialId(null);
            setShowPipelineSettingsModal(true);
          }}
        />
        {instances.length > 0 && (
          <div className="relative">
            <Smartphone className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={instanceFilter}
              onChange={(e) => setInstanceFilter(e.target.value)}
              className={`h-8 text-xs font-medium rounded-lg pl-7 pr-6 border cursor-pointer appearance-none outline-none transition-all ${
                instanceFilter !== 'all'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#007e3a] text-[#007e3a] dark:text-emerald-400 font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
              title="Filter deals by WhatsApp Line"
            >
              <option value="all">All Lines</option>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>{i.display_name}</option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
        <button
          onClick={() => setShowAddStageModal(true)}
          className="px-3 py-1.5 border border-[#007e3a]/60 text-[#007e3a] hover:bg-[#007e3a]/5 text-xs font-medium rounded-lg transition duration-200 flex items-center space-x-1.5 shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Stage</span>
        </button>
        <button
          onClick={() => setShowAddDealModal(true)}
          className="px-3 py-1.5 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-medium rounded-lg shadow-xs hover:shadow-sm transition duration-200 flex items-center space-x-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Deal</span>
        </button>
      </PageHeader>

      {/* Active Pipeline Info Bar */}
      {activePipeline && (
        <PipelineInfoBar
          activePipeline={activePipeline}
          onToggleAutoCreate={handleToggleAutoCreate}
          onActivate={handleActivatePipeline}
          onManageFields={() => {
            setManagePipelineInitialId(activePipeline.id);
            setShowPipelineSettingsModal(true);
          }}
        />
      )}

      {isLoading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#007e3a]" />
        </div>
      ) : (
        /* Kanban board fills remaining height — horizontal scroll handled inside KanbanBoard */
        <div className="flex-1 min-h-0 flex flex-col">
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
      )}

      {(showAddDealModal || editingDeal) && (
        <AddDealModal
          contacts={contacts}
          initialData={editingDeal || undefined}
          extraFields={allActiveExtraFields}
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
          initialPipelineId={managePipelineInitialId}
          onClose={() => {
            setShowPipelineSettingsModal(false);
            setManagePipelineInitialId(null);
          }}
          onActivate={handleActivatePipeline}
          onDelete={handleDeletePipeline}
          onUpdate={handleUpdatePipeline}
          onCreateNew={() => {
            setShowCreatePipelineModal(true);
            setShowPipelineSettingsModal(false);
            setManagePipelineInitialId(null);
          }}
        />
      )}
      
      {showAddStageModal && (
        <AddStageModal
          onClose={() => setShowAddStageModal(false)}
          onSubmit={(title, color, isConfirmed) => {
            handleAddStage(title, color, isConfirmed);
            setShowAddStageModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Pipeline;
