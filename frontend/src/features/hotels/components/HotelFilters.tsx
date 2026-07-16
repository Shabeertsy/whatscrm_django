import React, { useState, useEffect } from 'react';
import { Tag, Building2, Bed, Star } from 'lucide-react';
import { RoomFilters } from '../hooks/useRoomFilters';



interface HotelFiltersProps {
  filters: RoomFilters;
  updateFilter: (key: keyof RoomFilters, value: any) => void;
  toggleArrayFilter: (key: 'propertyTypes' | 'roomTypes' | 'amenities', value: string) => void;
  clearFilters: () => void;
  propertyTypeOptions: any[];
  roomTypeOptions: any[];
  amenityOptions: any[];
  showFilters: boolean;
  setPage: (page: number) => void;
}



export function HotelFilters({
  filters, updateFilter, toggleArrayFilter, clearFilters,
  propertyTypeOptions, roomTypeOptions, amenityOptions, showFilters, setPage
}: HotelFiltersProps) {
  const [localPriceMin, setLocalPriceMin] = useState(filters.priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(filters.priceMax);
  const [showAllPropertyTypes, setShowAllPropertyTypes] = useState(false);
  const [showAllRoomTypes, setShowAllRoomTypes] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    setLocalPriceMin(filters.priceMin);
    setLocalPriceMax(filters.priceMax);
  }, [filters.priceMin, filters.priceMax]);

  useEffect(() => {
    const t = setTimeout(() => {
      let changed = false;
      if (localPriceMin !== filters.priceMin) {
        updateFilter('priceMin', localPriceMin);
        changed = true;
      }
      if (localPriceMax !== filters.priceMax) {
        updateFilter('priceMax', localPriceMax);
        changed = true;
      }
      if (changed) setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [localPriceMin, localPriceMax, filters, updateFilter, setPage]);

  return (
    <div className={`w-full lg:w-60 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-5 ${showFilters ? 'block' : 'hidden lg:block'}`}>
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-[#007e3a]" /> Price Per Night
        </h3>
        <div className="relative h-1.5 mb-6 mx-1 mt-2">
          <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full" />
          <div 
            className="absolute h-full bg-[#007e3a] rounded-full"
            style={{ 
              left: `${(localPriceMin / 20000) * 100}%`, 
              right: `${100 - (localPriceMax / 20000) * 100}%` 
            }}
          />
          <input 
            type="range" min="0" max="20000" step="100" 
            value={localPriceMin}
            onChange={e => setLocalPriceMin(Math.min(Number(e.target.value), localPriceMax - 100))}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#007e3a] [&::-webkit-slider-thumb]:cursor-grab"
          />
          <input 
            type="range" min="0" max="20000" step="100" 
            value={localPriceMax}
            onChange={e => setLocalPriceMax(Math.max(Number(e.target.value), localPriceMin + 100))}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#007e3a] [&::-webkit-slider-thumb]:cursor-grab"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-1 block">Min (₹)</label>
            <input type="number" min="0" value={localPriceMin || ''} placeholder="0"
              onChange={e => setLocalPriceMin(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007e3a]/50 focus:border-[#007e3a] transition-all" />
          </div>
          <div className="text-slate-300 dark:text-slate-600 mt-5 font-medium">-</div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-1 block">Max (₹)</label>
            <input type="number" min="0" value={localPriceMax || ''} placeholder="Any"
              onChange={e => setLocalPriceMax(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007e3a]/50 focus:border-[#007e3a] transition-all" />
          </div>
        </div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-[#007e3a]" /> Property Type
        </h3>
        <div className="space-y-2">
          {(showAllPropertyTypes ? propertyTypeOptions : propertyTypeOptions.slice(0, 6)).map(t => {
            const idVal = t.uuid || t.id;
            const nameVal = t.property_type_name || t.name;
            return (
              <label key={idVal} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={filters.propertyTypes.includes(idVal)} 
                  onChange={() => { toggleArrayFilter('propertyTypes', idVal); setPage(1); }}
                  className="h-3.5 w-3.5 rounded accent-[#007e3a]" />
                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{nameVal}</span>
              </label>
            );
          })}
          {propertyTypeOptions.length > 6 && (
            <button onClick={() => setShowAllPropertyTypes(!showAllPropertyTypes)}
              className="text-xs font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-2 text-left w-full">
              {showAllPropertyTypes ? '- Show Less' : `+ Show ${propertyTypeOptions.length - 6} More`}
            </button>
          )}
        </div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bed className="h-3.5 w-3.5 text-[#007e3a]" /> Room Type
        </h3>
        <div className="space-y-2">
          {(showAllRoomTypes ? roomTypeOptions : roomTypeOptions.slice(0, 6)).map(t => {
            const idVal = t.uuid || t.id;
            return (
              <label key={idVal} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={filters.roomTypes.includes(idVal)} 
                  onChange={() => { toggleArrayFilter('roomTypes', idVal); setPage(1); }}
                  className="h-3.5 w-3.5 rounded accent-[#007e3a]" />
                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{t.name}</span>
              </label>
            );
          })}
          {roomTypeOptions.length > 6 && (
            <button onClick={() => setShowAllRoomTypes(!showAllRoomTypes)}
              className="text-xs font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-2 text-left w-full">
              {showAllRoomTypes ? '- Show Less' : `+ Show ${roomTypeOptions.length - 6} More`}
            </button>
          )}
        </div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-[#007e3a]" /> Amenities
        </h3>
        <div className="space-y-2">
          {(showAllAmenities ? amenityOptions : amenityOptions.slice(0, 6)).map(a => {
            const idVal = a.uuid || a.id;
            return (
              <label key={idVal} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={filters.amenities.includes(idVal)} 
                  onChange={() => { toggleArrayFilter('amenities', idVal); setPage(1); }}
                  className="h-3.5 w-3.5 rounded accent-[#007e3a]" />
                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {a.icon && <i className={`fa ${a.icon} w-3 text-center mr-1 text-slate-400`} />}
                  {a.name}
                </span>
              </label>
            );
          })}
          {amenityOptions.length > 6 && (
            <button onClick={() => setShowAllAmenities(!showAllAmenities)}
              className="text-xs font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-2 text-left w-full">
              {showAllAmenities ? '- Show Less' : `+ Show ${amenityOptions.length - 6} More`}
            </button>
          )}
        </div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={filters.hideUnavailable} 
          onChange={e => { updateFilter('hideUnavailable', e.target.checked); setPage(1); }}
          className="h-3.5 w-3.5 rounded accent-[#007e3a]" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Hide unavailable</span>
      </label>

      <button onClick={() => { clearFilters(); setPage(1); }}
        className="w-full text-xs font-semibold text-slate-500 hover:text-[#007e3a] py-1 transition-colors">
        Clear All Filters
      </button>
    </div>
  );
}
