import React from 'react';
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
  return (
    <div className={`w-full lg:w-60 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-5 ${showFilters ? 'block' : 'hidden lg:block'}`}>
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-[#007e3a]" /> Price Per Night
        </h3>
        <input type="range" min="0" max="20000" step="500" value={filters.priceMax}
          onChange={e => { updateFilter('priceMax', Number(e.target.value)); setPage(1); }}
          className="w-full accent-[#007e3a]" />
        <div className="text-xs text-slate-500 mt-1">₹0 – ₹{filters.priceMax.toLocaleString()}</div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-[#007e3a]" /> Property Type
        </h3>
        <div className="space-y-2">
          {propertyTypeOptions.map(t => {
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
        </div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bed className="h-3.5 w-3.5 text-[#007e3a]" /> Room Type
        </h3>
        <div className="space-y-2">
          {roomTypeOptions.map(t => {
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
        </div>
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-[#007e3a]" /> Amenities
        </h3>
        <div className="space-y-2">
          {amenityOptions.map(a => {
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
