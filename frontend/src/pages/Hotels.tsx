import React, { useState, useMemo } from 'react';
import { Bed, MapPin, Users, SlidersHorizontal, Share2, ChevronLeft, ChevronRight, Filter, X, RotateCcw } from 'lucide-react';
import { useRouter } from '../router';
import { useHotelStore } from '../store/hotelStore';

import { useRoomFilters } from '../features/hotels/hooks/useRoomFilters';
import { useHotels } from '../features/hotels/hooks/useHotels';
import { useShareRoom } from '../features/hotels/hooks/useShareRoom';

import { HotelSearchBar } from '../features/hotels/components/HotelSearchBar';
import { HotelFilters, normalizePropertyTypes, PropertyTypeGroup } from '../features/hotels/components/HotelFilters';
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

  const { filters, setFilters, updateFilter, toggleArrayFilter, clearFilters, page, setPage } = useRoomFilters();
  const { 
    rooms, loading, error, totalPages, resultCount, 
    propertyTypeOptions, roomTypeOptions, amenityOptions,
    roomViewOptions, bedroomTypeOptions, tagOptions, mealPlanOptions, areaOptions, fetchRooms 
  } = useHotels(filters, setPage, page);

  const [showFilters, setShowFilters] = useState(false);
  const shareState = useShareRoom(filters, amenityOptions, propertyTypeOptions, rooms);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());

  // Clean deduplicated property types
  const normalizedPropertyTypes = useMemo(() => {
    return normalizePropertyTypes(propertyTypeOptions);
  }, [propertyTypeOptions]);

  const handlePillClick = (group: PropertyTypeGroup) => {
    const isSelected = group.ids.some(id => filters.propertyTypes.includes(id));
    if (isSelected) {
      const next = filters.propertyTypes.filter(id => !group.ids.includes(id));
      updateFilter('propertyTypes', next);
    } else {
      updateFilter('propertyTypes', group.ids);
    }
    setPage(1);
  };

  const handleClearPropertyTypes = () => {
    updateFilter('propertyTypes', []);
    setPage(1);
  };

  // Build active filters for dismissible tags
  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (filters.search) {
      chips.push({
        id: 'search',
        label: `"${filters.search}"`,
        onRemove: () => { updateFilter('search', ''); setPage(1); }
      });
    }

    normalizedPropertyTypes.forEach(g => {
      if (g.ids.some(id => filters.propertyTypes.includes(id))) {
        chips.push({
          id: `prop-${g.key}`,
          label: g.name,
          onRemove: () => {
            const next = filters.propertyTypes.filter(id => !g.ids.includes(id));
            updateFilter('propertyTypes', next);
            setPage(1);
          }
        });
      }
    });

    if (filters.priceMin > 0 || filters.priceMax < 50000) {
      chips.push({
        id: 'price',
        label: `₹${filters.priceMin.toLocaleString()} – ₹${filters.priceMax.toLocaleString()}`,
        onRemove: () => {
          updateFilter('priceMin', 0);
          updateFilter('priceMax', 50000);
          setPage(1);
        }
      });
    }

    filters.roomTypes.forEach(id => {
      const match = roomTypeOptions.find(o => (o.uuid || o.id) === id);
      chips.push({
        id: `room-${id}`,
        label: `Room: ${match?.name || id}`,
        onRemove: () => { toggleArrayFilter('roomTypes', id); setPage(1); }
      });
    });

    filters.amenities.forEach(id => {
      const match = amenityOptions.find(o => (o.uuid || o.id) === id);
      chips.push({
        id: `amenity-${id}`,
        label: match?.name || id,
        onRemove: () => { toggleArrayFilter('amenities', id); setPage(1); }
      });
    });

    filters.areas.forEach(id => {
      const match = areaOptions.find(o => o.uuid === id);
      chips.push({
        id: `area-${id}`,
        label: `Area: ${match?.name || id}`,
        onRemove: () => { toggleArrayFilter('areas', id); setPage(1); }
      });
    });

    if (filters.hideUnavailable) {
      chips.push({
        id: 'hideUnavailable',
        label: 'Available only',
        onRemove: () => { updateFilter('hideUnavailable', false); setPage(1); }
      });
    }

    return chips;
  }, [filters, normalizedPropertyTypes, roomTypeOptions, amenityOptions, areaOptions, updateFilter, toggleArrayFilter, setPage]);

  const handleResetAll = () => {
    clearFilters();
    updateFilter('search', '');
    setPage(1);
  };

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
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 flex items-center justify-center bg-[#007e3a] text-white text-[11px] font-black rounded-full">
                {selectedRoomIds.size}
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                room{selectedRoomIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <button
              onClick={handleShareSelected}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#007e3a] hover:bg-[#00602d] text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
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
          roomViewOptions={roomViewOptions}
          bedroomTypeOptions={bedroomTypeOptions}
          tagOptions={tagOptions}
          mealPlanOptions={mealPlanOptions}
          areaOptions={areaOptions}
          showFilters={showFilters}
          setPage={setPage}
        />

        {/* Rooms Table Column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Quick Category Pills & Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
              <button
                type="button"
                onClick={handleClearPropertyTypes}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filters.propertyTypes.length === 0
                    ? 'bg-[#007e3a] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                All Stays
              </button>
              {normalizedPropertyTypes.slice(0, 8).map(group => {
                const isSelected = group.ids.some(id => filters.propertyTypes.includes(id));
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => handlePillClick(group)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#007e3a] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              <select
                value={filters.sort || 'price_asc'}
                onChange={e => { updateFilter('sort', e.target.value); setPage(1); }}
                className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a] hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer appearance-none pr-7 transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '0.85em'
                }}
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
              {activeChips.map(chip => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 ml-auto text-xs font-semibold text-[#007e3a] hover:text-[#00602d] dark:hover:text-[#38b26e] hover:underline px-1 py-0.5 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset all
              </button>
            </div>
          )}

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
                          <div className="flex items-center gap-1.5 group/prop">
                            <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={room.owner_username || room.owner_brand_name || ''}>
                              {room.owner_username || room.owner_brand_name || '—'}
                            </p>
                            {(room.owner_username || room.owner_brand_name) && (
                              <button
                                type="button"
                                title={`Filter by property: ${room.owner_username || room.owner_brand_name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const pName = room.owner_username || room.owner_brand_name;
                                  updateFilter('search', pName);
                                  setPage(1);
                                }}
                                className="opacity-0 group-hover/prop:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-[#007e3a] hover:bg-[#007e3a]/10 rounded cursor-pointer"
                              >
                                <Filter className="h-3 w-3" />
                              </button>
                            )}
                          </div>
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
