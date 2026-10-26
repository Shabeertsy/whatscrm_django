import React from 'react';
import { useConfirmedBookings } from './hooks/useConfirmedBookings';
import {
  ConfirmedBookingsStats,
  ConfirmedBookingsFilters,
  ConfirmedBookingsTable,
  ViewBookingModal,
  EditBookingModal,
  BookingNoteModal,
} from './components/confirmed_bookings';


export function ConfirmedBookings() {
  const {
    bookings,
    filteredBookings,
    pipelineNames,
    selectedPipeline,
    setSelectedPipeline,
    search,
    setSearch,
    loading,
    deletingId,
    totalValue,
    extraFieldColumns,
    getBookingFields,

    // Pagination
    page,
    pageSize,
    totalPages,
    totalCount,
    handlePageChange,
    handlePageSizeChange,

    // Modals
    viewingBooking,
    setViewingBooking,
    editingBookingData,
    setEditingBookingData,
    savingBooking,
    handleOpenEdit,
    handleUpdateEditField,
    handleUpdateEditExtraData,
    handleSaveBooking,
    handleDeleteBooking,

    // Note Modal
    editingBookingNote,
    noteText,
    setNoteText,
    savingNote,
    handleOpenNoteModal,
    handleCloseNoteModal,
    handleSaveNoteModal,
  } = useConfirmedBookings();

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Confirmed Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All deals confirmed across every pipeline
          </p>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <ConfirmedBookingsStats
        loading={loading}
        totalBookings={totalCount}
        totalValue={totalValue}
        pipelinesCount={pipelineNames.length}
      />

      {/* Search & Pipeline Filters */}
      <ConfirmedBookingsFilters
        search={search}
        onSearchChange={setSearch}
        selectedPipeline={selectedPipeline}
        onPipelineChange={setSelectedPipeline}
        pipelineNames={pipelineNames}
      />

      {/* Bookings Data Table */}
      <ConfirmedBookingsTable
        bookings={filteredBookings}
        totalBookingsCount={totalCount}
        loading={loading}
        extraFieldColumns={extraFieldColumns}
        deletingId={deletingId}
        selectedPipeline={selectedPipeline}
        onView={setViewingBooking}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteBooking}
        onOpenNote={handleOpenNoteModal}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* View Booking Modal */}
      <ViewBookingModal
        booking={viewingBooking}
        onClose={() => setViewingBooking(null)}
        onEdit={handleOpenEdit}
        getBookingFields={getBookingFields}
      />

      {/* Edit Booking Modal */}
      <EditBookingModal
        data={editingBookingData}
        saving={savingBooking}
        onUpdateField={handleUpdateEditField}
        onUpdateExtraData={handleUpdateEditExtraData}
        onClose={() => setEditingBookingData(null)}
        onSave={handleSaveBooking}
        getBookingFields={getBookingFields}
      />

      {/* Quick Edit Note Modal */}
      <BookingNoteModal
        booking={editingBookingNote}
        noteText={noteText}
        saving={savingNote}
        onNoteChange={setNoteText}
        onClose={handleCloseNoteModal}
        onSave={handleSaveNoteModal}
      />
    </div>
  );
}

export default ConfirmedBookings;
