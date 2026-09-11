import React, { useState } from 'react';
import { Bed, MapPin, Users, SlidersHorizontal, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from '../router';
import { useHotelStore } from '../store/hotelStore';

import { useRoomFilters } from '../features/hotels/hooks/useRoomFilters';
import { useHotels } from '../features/hotels/hooks/useHotels';
import { useShareRoom } from '../features/hotels/hooks/useShareRoom';

import { HotelSearchBar } from '../features/hotels/components/HotelSearchBar';
import { HotelFilters } from '../features/hotels/components/HotelFilters';
import { ShareRoomModal } from '../features/hotels/components/ShareRoomModal';
import { EmptyState } from '../features/hotels/components/EmptyState';
import { LoadingState } from '../features/hotels/components/LoadingState';
import { useCurrentUser } from '../utils/dataScope';



export function Hotels() {
  const { navigate } = useRouter();
  const setSelectedHotel = useHotelStore(state => state.setSelectedHotel);
  
  const currentUser = useCurrentUser();
  const isSuperuser = currentUser?.is_superuser || currentUser?.role === 'Owner';
  const locationName = currentUser?.location_name || '';

  const { filters, setFilters, updateFilter, toggleArrayFilter, clearFilters } = useRoomFilters();
  const [page, setPage] = useState(1);
  const { 
    rooms, loading, error, totalPages, resultCount, 
    propertyTypeOptions, roomTypeOptions, amenityOptions, fetchRooms 
  } = useHotels(filters, setPage, page);

  const [showFilters, setShowFilters] = useState(false);
  const shareState = useShareRoom(filters, amenityOptions, propertyTypeOptions);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());

  const toggleRoomSelection = (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRoomIds.size === rooms.length && rooms.length > 0) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(rooms.map((r: any) => r.uuid)));
    }
  };

  const handleShareSelected = () => {
    const selected = rooms.filter((r: any) => selectedRoomIds.has(r.uuid));
    if (selected.length > 0) shareState.setSelectedShareRoom(selected);
  };

  const getStatusInfo = (room: any) => {
    const isAvailable = room.availability ? room.availability.available : room.status === 'available';
    const text = room.availability 
      ? (room.availability.available ? 'Available' : (room.availability.message || 'Not Available')) 
      : (room.status || 'N/A');
    const badgeClass = isAvailable 
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
      : 'bg-red-100 text-red-700 border-red-200';
    return { text, badgeClass };
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bed className="h-6 w-6 text-[#007e3a]" /> Rooms & Stays
            {!isSuperuser && locationName && (
              <span className="text-sm font-semibold bg-[#007e3a]/10 text-[#007e3a] px-3 py-1 rounded-full flex items-center gap-1.5 ml-3">
                <MapPin className="h-4 w-4" /> {locationName}
              </span>
            )}
          </h1>
          {!loading && <p className="text-sm text-slate-500 mt-0.5">{resultCount} rooms found</p>}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Multi-select Share Bar */}
      {selectedRoomIds.size > 0 && (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-[#007e3a]/40 shadow-lg shadow-[#007e3a]/10 rounded-2xl px-4 py-2.5">
            {/* Count badge */}
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 flex items-center justify-center bg-[#007e3a] text-white text-[11px] font-black rounded-full">
                {selectedRoomIds.size}
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                room{selectedRoomIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            {/* Share button */}
            <button
              onClick={handleShareSelected}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#007e3a] hover:bg-[#00602d] text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            {/* Clear */}
            <button
              onClick={() => setSelectedRoomIds(new Set())}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
              title="Clear selection"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">{error}</div>
      )}

      <HotelSearchBar filters={filters} updateFilter={updateFilter} onSearch={() => fetchRooms(true)} />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        <HotelFilters 
          filters={filters}
          updateFilter={updateFilter}
          toggleArrayFilter={toggleArrayFilter}
          clearFilters={clearFilters}
          propertyTypeOptions={propertyTypeOptions}
          roomTypeOptions={roomTypeOptions}
          amenityOptions={amenityOptions}
          showFilters={showFilters}
          setPage={setPage}
        />

        {/* Rooms Table */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Room</th>
                    <th className="px-5 py-3.5">Property</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Phone</th>
                    <th className="px-5 py-3.5">Occupancy</th>
                    <th className="px-5 py-3.5">Price</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-3 py-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={rooms.length > 0 && selectedRoomIds.size === rooms.length}
                        ref={el => { if (el) el.indeterminate = selectedRoomIds.size > 0 && selectedRoomIds.size < rooms.length; }}
                        onChange={toggleSelectAll}
                        onClick={e => e.stopPropagation()}
                        className="h-4 w-4 rounded accent-[#007e3a] cursor-pointer"
                        title="Select all"
                      />
                    </th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <LoadingState />
                  ) : rooms.length === 0 ? (
                    <EmptyState />
                  ) : (
                    rooms.map((room: any, idx: number) => (
                      <tr key={room.uuid || idx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer ${
                          selectedRoomIds.has(room.uuid) ? 'bg-[#007e3a]/5 dark:bg-[#007e3a]/10' : ''
                        }`}
                        onClick={() => { setSelectedHotel(room); navigate(`/hotels/${room.uuid}`); }}>
                        {/* Room */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                              {room.room_images?.length > 0 ? (
                                <img src={room.room_images[0].url || room.room_images[0].image} alt={room.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center"><Bed className="h-5 w-5 text-slate-300" /></div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white group-hover:text-[#007e3a] transition-colors truncate max-w-[140px]">{room.name}</p>
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">{room.room_type?.name || '—'}</span>
                            </div>
                          </div>
                        </td>
                        {/* Property */}
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{room.owner_username || room.owner_brand_name || '—'}</p>
                          <span className="text-[10px] text-slate-400">{room.property_type?.name}</span>
                        </td>
                        {/* Location */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-1.5 max-w-[160px]">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight" title={room.property_location?.name || room.property_location?.city || '—'}>
                                {room.property_location?.name || room.property_location?.city || '—'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 truncate">
                                {room.property_location?.name 
                                  ? [room.property_location.city, room.property_location.state].filter(Boolean).join(', ')
                                  : room.property_location?.state}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Phone */}
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {room.owner_phone || '—'}
                          </p>
                        </td>
                        {/* Occupancy */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Users className="h-3.5 w-3.5" />
                            <span className="text-xs">{room.base_occupancy}–{room.max_occupancy}</span>
                          </div>
                          {room.room_number && <span className="text-[10px] text-slate-400">Room #{room.room_number}</span>}
                        </td>
                        {/* Price */}
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 dark:text-white text-[15px]">
                            ₹{(room.price_summary?.grand_total ?? room.grand_total ?? room.price)?.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {room.price_summary?.nights ? `${room.price_summary.nights} night` : 'per night'}
                          </span>
                          {room.price_summary?.gst_amount > 0 && (
                            <span className="block text-[9px] text-[#007e3a] font-medium mt-0.5">
                              Incl. {room.price_summary.gst_pct}% GST
                            </span>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {(() => {
                            const { text, badgeClass } = getStatusInfo(room);
                            return (
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                                {text}
                              </span>
                            );
                          })()}
                        </td>
                        {/* Select */}
                        <td className="px-3 py-3.5 text-center" onClick={e => toggleRoomSelection(room.uuid, e)}>
                          <input
                            type="checkbox"
                            checked={selectedRoomIds.has(room.uuid)}
                            onChange={() => {}}
                            onClick={e => toggleRoomSelection(room.uuid, e)}
                            className="h-4 w-4 rounded accent-[#007e3a] cursor-pointer"
                          />
                        </td>
                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={e => { e.stopPropagation(); shareState.setSelectedShareRoom(room); }}
                            className="text-slate-500 hover:text-[#007e3a] bg-slate-100 dark:bg-slate-800 hover:bg-[#007e3a]/10 p-2 rounded-lg transition-colors"
                            title="Share Room"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && rooms.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-xs text-slate-500">Page <b className="text-slate-800 dark:text-slate-200">{page}</b> of <b className="text-slate-800 dark:text-slate-200">{totalPages}</b> · {resultCount} total</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareRoomModal {...shareState} filters={filters} amenityOptions={amenityOptions} propertyTypeOptions={propertyTypeOptions} />
    </div>
  );
}

export default Hotels;
