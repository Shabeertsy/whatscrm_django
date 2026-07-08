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




export function Hotels() {
  const { navigate } = useRouter();
  const setSelectedHotel = useHotelStore(state => state.setSelectedHotel);

  const { filters, setFilters, updateFilter, toggleArrayFilter, clearFilters } = useRoomFilters();
  const [page, setPage] = useState(1);
  const { 
    rooms, loading, error, totalPages, resultCount, 
    propertyTypeOptions, roomTypeOptions, amenityOptions, fetchRooms 
  } = useHotels(filters, setPage, page);

  const [showFilters, setShowFilters] = useState(false);
  const shareState = useShareRoom();

  const getStatusBadge = (status: string) => {
    if (status === 'available') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'booked') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bed className="h-6 w-6 text-[#007e3a]" /> Rooms & Stays
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
                      <tr key={room.uuid || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
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
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{room.property_location?.city || '—'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 ml-5">{room.property_location?.state}</span>
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
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(room.status)}`}>
                            {room.status || 'N/A'}
                          </span>
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

      <ShareRoomModal {...shareState} />
    </div>
  );
}

export default Hotels;
