import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { usePipelineTable } from './hooks/usePipelineTable';
import {
  PipelineTableStats,
  PipelineTableFilters,
  PipelineTableView,
  DealNoteModal,
} from './components';
import { AddDealModal } from '../pipeline/components/AddDealModal';
import { Deal } from '../pipeline/api';

export function PipelineTable() {
  const {
    pipelines,
    activePipeline,
    stages,
    deals,
    totalDealsCount,
    contacts,
    loading,
    deletingId,
    stats,
    extraFieldColumns,
    allPipelineFields,

    // Pagination
    page,
    pageSize,
    totalPages,
    totalCount,
    handlePageChange,
    handlePageSizeChange,

    // Filters
    selectedPipelineId,
    setSelectedPipelineId,
    selectedStageId,
    setSelectedStageId,
    timeframe,
    setTimeframe,
    search,
    setSearch,

    // Actions
    handleStageChange,
    handleAssignUser,
    handleDeleteDeal,
    handleSaveDeal,
    agents,

    // Note Modal
    editingNoteDeal,
    noteText,
    setNoteText,
    savingNote,
    handleOpenNoteModal,
    handleCloseNoteModal,
    handleSaveNoteModal,
  } = usePipelineTable();

  // Selected deal for View/Edit popup modal (exact same modal as pipeline page)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [isAddingDeal, setIsAddingDeal] = useState(false);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Pipeline Deals Table"
        description="Comprehensive table view of all deals, stages, contacts, and custom attributes."
      />

      {/* KPI Stats Overview */}
      <PipelineTableStats stats={stats} loading={loading} />

      {/* Table Toolbar & Filters */}
      <PipelineTableFilters
        search={search}
        onSearchChange={setSearch}
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        onPipelineChange={setSelectedPipelineId}
        stages={stages}
        selectedStageId={selectedStageId}
        onStageChange={setSelectedStageId}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        onAddDeal={() => {
          setActiveDeal(null);
          setIsAddingDeal(true);
        }}
      />

      {/* Main Deals Table View */}
      <PipelineTableView
        deals={deals}
        totalDealsCount={totalCount}
        stages={stages}
        agents={agents}
        loading={loading}
        extraFieldColumns={extraFieldColumns}
        deletingId={deletingId}
        pipelineName={activePipeline?.name}
        onStageChange={handleStageChange}
        onAssignUser={handleAssignUser}
        onView={deal => setActiveDeal(deal)}
        onEdit={deal => setActiveDeal(deal)}
        onDelete={handleDeleteDeal}
        onOpenNote={handleOpenNoteModal}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Same View/Edit Popup Modal as Pipeline Page */}
      {(isAddingDeal || activeDeal) && (
        <AddDealModal
          contacts={contacts}
          initialData={activeDeal || undefined}
          extraFields={allPipelineFields}
          stages={stages}
          agents={agents}
          onClose={() => {
            setActiveDeal(null);
            setIsAddingDeal(false);
          }}
          onSubmit={async (data) => {
            const ok = await handleSaveDeal({
              ...data,
              pipeline: selectedPipelineId,
            });
            if (ok) {
              setActiveDeal(null);
              setIsAddingDeal(false);
            }
            return ok;
          }}
          onDelete={
            activeDeal
              ? async () => {
                  await handleDeleteDeal(activeDeal);
                  setActiveDeal(null);
                }
              : undefined
          }
        />
      )}

      {/* Quick Note Modal */}
      <DealNoteModal
        deal={editingNoteDeal}
        noteText={noteText}
        saving={savingNote}
        onNoteChange={setNoteText}
        onClose={handleCloseNoteModal}
        onSave={handleSaveNoteModal}
      />
    </div>
  );
}

export default PipelineTable;
