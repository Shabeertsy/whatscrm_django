import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { GuestSelector } from './GuestSelector';
import { RoomFilters } from '../hooks/useRoomFilters';



interface HotelSearchBarProps {
  filters: RoomFilters;
  updateFilter: (key: keyof RoomFilters, value: any) => void;
  onSearch: () => void;
}

export function HotelSearchBar({ filters, updateFilter, onSearch }: HotelSearchBarProps) {
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  return (
    <div className="flex justify-end">
      <div className="inline-block w-full md:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
          <div className="w-full md:w-[300px] lg:w-[400px] px-5 py-3.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search</label>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                placeholder="Room name, property, location..."
                className="text-[13px] font-medium text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full placeholder-slate-400"
              />
            </div>
          </div>
          <div className="px-5 py-3.5 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check In</label>
            <input type="date" value={filters.checkIn} onChange={e => updateFilter('checkIn', e.target.value)}
              className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full cursor-pointer" />
          </div>
          <div className="px-5 py-3.5 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check Out</label>
            <input type="date" value={filters.checkOut} onChange={e => updateFilter('checkOut', e.target.value)}
              className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full cursor-pointer" />
          </div>
          <GuestSelector
            adults={filters.adults}
            children={filters.children}
            roomsCount={filters.rooms}
            setAdults={val => updateFilter('adults', typeof val === 'function' ? val(filters.adults) : val)}
            setChildren={val => updateFilter('children', typeof val === 'function' ? val(filters.children) : val)}
            setRoomsCount={val => updateFilter('rooms', typeof val === 'function' ? val(filters.rooms) : val)}
            showDropdown={showGuestDropdown}
            setShowDropdown={setShowGuestDropdown}
          />
          <button onClick={onSearch} className="bg-[#007e3a] hover:bg-[#00602d] text-white font-bold text-sm px-8 py-4 md:rounded-r-xl transition-colors">
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
