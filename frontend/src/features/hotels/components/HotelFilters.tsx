import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Building2, Bed, Star, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { RoomFilters } from '../hooks/useRoomFilters';



interface HotelFiltersProps {
  filters: RoomFilters;
  updateFilter: (key: keyof RoomFilters, value: any) => void;
  toggleArrayFilter: (key: 'propertyTypes' | 'roomTypes' | 'amenities' | 'roomViews' | 'bedroomTypes' | 'tags' | 'mealPlans' | 'areas', value: string) => void;
  clearFilters: () => void;
  propertyTypeOptions: any[];
  roomTypeOptions: any[];
  amenityOptions: any[];
  roomViewOptions: any[];
  bedroomTypeOptions: any[];
  tagOptions: any[];
  mealPlanOptions: any[];
  areaOptions: any[];
  showFilters: boolean;
  setPage: (page: number) => void;
}

export interface PropertyTypeGroup {
  key: string;
  name: string;
  ids: string[];
}

export function normalizePropertyTypes(options: any[]): PropertyTypeGroup[] {
  if (!options || options.length === 0) return [];
  const map = new Map<string, { name: string; ids: string[] }>();

  for (const opt of options) {
    const id = String(opt.uuid || opt.id || '');
    const rawName = String(opt.property_type_name || opt.name || '').trim();
    if (!rawName || !id) continue;

    const lower = rawName.toLowerCase();
    let canonicalKey = lower;
    let canonicalName = rawName;

    if (lower === 'holiday home' || lower === 'holiday homes') {
      canonicalKey = 'holiday homes';
      canonicalName = 'Holiday Homes';
    } else if (lower === 'home stay' || lower === 'homestay' || lower === 'homestays') {
      canonicalKey = 'homestays';
      canonicalName = 'Homestays';
    } else if (lower === 'farm stay' || lower === 'farm stays') {
      canonicalKey = 'farm stays';
      canonicalName = 'Farm Stays';
    } else if (lower === 'guest house' || lower === 'guest houses') {
      canonicalKey = 'guest houses';
      canonicalName = 'Guest Houses';
    } else if (lower === 'apartment' || lower === 'apartments' || lower === 'apartments/ flats' || lower === 'apartments / flats') {
      canonicalKey = 'apartments / flats';
      canonicalName = 'Apartments / Flats';
    } else if (lower === 'bungalow' || lower === 'bungalows') {
      canonicalKey = 'bungalows';
      canonicalName = 'Bungalows';
    } else if (lower === 'cottage' || lower === 'cottages') {
      canonicalKey = 'cottages';
      canonicalName = 'Cottages';
    } else if (lower === 'villa' || lower === 'villas') {
      canonicalKey = 'villas';
      canonicalName = 'Villas';
    } else if (lower === 'hotel' || lower === 'hotels') {
      canonicalKey = 'hotels';
      canonicalName = 'Hotels';
    } else if (lower === 'resort' || lower === 'resorts') {
      canonicalKey = 'resorts';
      canonicalName = 'Resorts';
    } else if (lower === 'private property' || lower === 'private properties') {
      canonicalKey = 'private property';
      canonicalName = 'Private Property';
    } else {
      canonicalName = rawName
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      canonicalKey = canonicalName.toLowerCase();
    }

    if (!map.has(canonicalKey)) {
      map.set(canonicalKey, { name: canonicalName, ids: [] });
    }
    const grp = map.get(canonicalKey)!;
    if (!grp.ids.includes(id)) {
      grp.ids.push(id);
    }
  }

  return Array.from(map.entries())
    .map(([key, data]) => ({ key, name: data.name, ids: data.ids }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function HotelFilters({
  filters, updateFilter, toggleArrayFilter, clearFilters,
  propertyTypeOptions, roomTypeOptions, amenityOptions,
  roomViewOptions, bedroomTypeOptions, tagOptions, mealPlanOptions, areaOptions,
  showFilters, setPage
}: HotelFiltersProps) {
  const [localPriceMin, setLocalPriceMin] = useState(filters.priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(filters.priceMax);
  const [showAllPropertyTypes, setShowAllPropertyTypes] = useState(false);
  const [showAllRoomTypes, setShowAllRoomTypes] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllRoomViews, setShowAllRoomViews] = useState(false);
  const [showAllBedroomTypes, setShowAllBedroomTypes] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllMealPlans, setShowAllMealPlans] = useState(false);
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    propertyTypes: true,
    roomTypes: false,
    amenities: false,
    roomViews: false,
    bedroomTypes: false,
    tags: false,
    mealPlans: false,
    areas: false,
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Clean, deduplicated property types
  const normalizedPropertyTypes = useMemo(() => {
    return normalizePropertyTypes(propertyTypeOptions);
  }, [propertyTypeOptions]);

  const handleTogglePropertyTypeGroup = (group: PropertyTypeGroup) => {
    const isChecked = group.ids.some(id => filters.propertyTypes.includes(id));
    let next: string[];
    if (isChecked) {
      next = filters.propertyTypes.filter(id => !group.ids.includes(id));
    } else {
      next = Array.from(new Set([...filters.propertyTypes, ...group.ids]));
    }
    updateFilter('propertyTypes', next);
    setPage(1);
  };

  const areasByDistrict = areaOptions?.reduce((acc: any, area: any) => {
    const rawName = area.district?.name || 'Other';
    const districtName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

    if (!acc[districtName]) acc[districtName] = [];
    acc[districtName].push(area);
    return acc;
  }, {}) || {};

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

  // Count active selections for badge indicators
  const activePropertyTypeCount = normalizedPropertyTypes.filter(g =>
    g.ids.some(id => filters.propertyTypes.includes(id))
  ).length;
  const isPriceFiltered = filters.priceMin > 0 || filters.priceMax < 50000;

  return (
    <div className={`w-full lg:w-64 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full shadow-xs ${showFilters ? 'block' : 'hidden lg:block'}`}>

      {/* Price Section */}
      <div>
        <button onClick={() => toggleSection('price')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
          <span className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-[#007e3a]" /> Price Per Night
          </span>
          <div className="flex items-center gap-1.5">
            {isPriceFiltered && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#007e3a]" />
            )}
            {expandedSections.price ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </button>
        {expandedSections.price && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative h-1.5 mb-5 mx-1 mt-2">
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full" />
              <div
                className="absolute h-full bg-[#007e3a] rounded-full"
                style={{
                  left: `${(localPriceMin / 50000) * 100}%`,
                  right: `${100 - (localPriceMax / 50000) * 100}%`
                }}
              />
              <input
                type="range" min="0" max="50000" step="100"
                value={localPriceMin}
                onChange={e => setLocalPriceMin(Math.min(Number(e.target.value), localPriceMax - 100))}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#007e3a] [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:cursor-grab"
              />
              <input
                type="range" min="0" max="50000" step="100"
                value={localPriceMax}
                onChange={e => setLocalPriceMax(Math.max(Number(e.target.value), localPriceMin + 100))}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#007e3a] [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:cursor-grab"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Min (₹)</label>
                <input type="number" min="0" value={localPriceMin || ''} placeholder="0"
                  onChange={e => setLocalPriceMin(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a] transition-all" />
              </div>
              <div className="text-slate-300 dark:text-slate-600 mt-4 font-medium">-</div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Max (₹)</label>
                <input type="number" min="0" value={localPriceMax || ''} placeholder="Any"
                  onChange={e => setLocalPriceMax(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a] transition-all" />
              </div>
            </div>
          </div>
        )}
      </div>

      <hr className="border-slate-100 dark:border-slate-800" />

      {/* Property Types Section */}
      <div>
        <button onClick={() => toggleSection('propertyTypes')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
          <span className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-[#007e3a]" /> Property Type
          </span>
          <div className="flex items-center gap-1.5">
            {activePropertyTypeCount > 0 && (
              <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {activePropertyTypeCount}
              </span>
            )}
            {expandedSections.propertyTypes ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </button>

        {expandedSections.propertyTypes && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {(showAllPropertyTypes ? normalizedPropertyTypes : normalizedPropertyTypes.slice(0, 6)).map(group => {
              const isChecked = group.ids.some(id => filters.propertyTypes.includes(id));
              return (
                <label key={group.key} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleTogglePropertyTypeGroup(group)}
                    className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer"
                  />
                  <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {group.name}
                  </span>
                </label>
              );
            })}

            {normalizedPropertyTypes.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllPropertyTypes(!showAllPropertyTypes)}
                className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full cursor-pointer"
              >
                {showAllPropertyTypes ? '− Show Less' : `+ Show ${normalizedPropertyTypes.length - 6} More`}
              </button>
            )}
          </div>
        )}
      </div>

      <hr className="border-slate-100 dark:border-slate-800" />

      {/* Room Types Section */}
      <div>
        <button onClick={() => toggleSection('roomTypes')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
          <span className="flex items-center gap-2">
            <Bed className="h-3.5 w-3.5 text-[#007e3a]" /> Room Type
          </span>
          <div className="flex items-center gap-1.5">
            {filters.roomTypes.length > 0 && (
              <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {filters.roomTypes.length}
              </span>
            )}
            {expandedSections.roomTypes ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </button>
        {expandedSections.roomTypes && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {(showAllRoomTypes ? roomTypeOptions : roomTypeOptions.slice(0, 6)).map(t => {
              const idVal = t.uuid || t.id;
              const isChecked = filters.roomTypes.includes(idVal);
              return (
                <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                  <input type="checkbox" checked={isChecked}
                    onChange={() => { toggleArrayFilter('roomTypes', idVal); setPage(1); }}
                    className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                  <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {t.name}
                  </span>
                </label>
              );
            })}
            {roomTypeOptions.length > 6 && (
              <button onClick={() => setShowAllRoomTypes(!showAllRoomTypes)}
                className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full">
                {showAllRoomTypes ? '− Show Less' : `+ Show ${roomTypeOptions.length - 6} More`}
              </button>
            )}
          </div>
        )}
      </div>

      <hr className="border-slate-100 dark:border-slate-800" />

      {/* Amenities Section */}
      <div>
        <button onClick={() => toggleSection('amenities')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
          <span className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-[#007e3a]" /> Amenities
          </span>
          <div className="flex items-center gap-1.5">
            {filters.amenities.length > 0 && (
              <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {filters.amenities.length}
              </span>
            )}
            {expandedSections.amenities ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </button>
        {expandedSections.amenities && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {(showAllAmenities ? amenityOptions : amenityOptions.slice(0, 6)).map(a => {
              const idVal = a.uuid || a.id;
              const isChecked = filters.amenities.includes(idVal);
              return (
                <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                  <input type="checkbox" checked={isChecked}
                    onChange={() => { toggleArrayFilter('amenities', idVal); setPage(1); }}
                    className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                  <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {a.icon && <i className={`fa ${a.icon} w-3 text-center mr-1 text-slate-400`} />}
                    {a.name}
                  </span>
                </label>
              );
            })}
            {amenityOptions.length > 6 && (
              <button onClick={() => setShowAllAmenities(!showAllAmenities)}
                className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full cursor-pointer">
                {showAllAmenities ? '− Show Less' : `+ Show ${amenityOptions.length - 6} More`}
              </button>
            )}
          </div>
        )}
      </div>
      <hr className="border-slate-100 dark:border-slate-800" />

      {roomViewOptions.length > 0 && (
        <>
          <div>
            <button onClick={() => toggleSection('roomViews')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
              <span className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-[#007e3a]" /> Room Views</span>
              <div className="flex items-center gap-1.5">
                {filters.roomViews.length > 0 && (
                  <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                    {filters.roomViews.length}
                  </span>
                )}
                {expandedSections.roomViews ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </div>
            </button>
            {expandedSections.roomViews && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {(showAllRoomViews ? roomViewOptions : roomViewOptions.slice(0, 6)).map(a => {
                  const idVal = a.uuid || a.id;
                  const isChecked = filters.roomViews.includes(idVal);
                  return (
                    <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                      <input type="checkbox" checked={isChecked}
                        onChange={() => { toggleArrayFilter('roomViews', idVal); setPage(1); }}
                        className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                      <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {a.name}
                      </span>
                    </label>
                  );
                })}
                {roomViewOptions.length > 6 && (
                  <button onClick={() => setShowAllRoomViews(!showAllRoomViews)}
                    className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full">
                    {showAllRoomViews ? '− Show Less' : `+ Show ${roomViewOptions.length - 6} More`}
                  </button>
                )}
              </div>
            )}
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
        </>
      )}

      {bedroomTypeOptions.length > 0 && (
        <>
          <div>
            <button onClick={() => toggleSection('bedroomTypes')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
              <span className="flex items-center gap-2"><Bed className="h-3.5 w-3.5 text-[#007e3a]" /> Bedroom Types</span>
              <div className="flex items-center gap-1.5">
                {filters.bedroomTypes.length > 0 && (
                  <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                    {filters.bedroomTypes.length}
                  </span>
                )}
                {expandedSections.bedroomTypes ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </div>
            </button>
            {expandedSections.bedroomTypes && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {(showAllBedroomTypes ? bedroomTypeOptions : bedroomTypeOptions.slice(0, 6)).map(a => {
                  const idVal = a.uuid || a.id;
                  const isChecked = filters.bedroomTypes.includes(idVal);
                  return (
                    <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                      <input type="checkbox" checked={isChecked}
                        onChange={() => { toggleArrayFilter('bedroomTypes', idVal); setPage(1); }}
                        className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                      <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {a.name}
                      </span>
                    </label>
                  );
                })}
                {bedroomTypeOptions.length > 6 && (
                  <button onClick={() => setShowAllBedroomTypes(!showAllBedroomTypes)}
                    className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full">
                    {showAllBedroomTypes ? '− Show Less' : `+ Show ${bedroomTypeOptions.length - 6} More`}
                  </button>
                )}
              </div>
            )}
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
        </>
      )}

      {tagOptions.length > 0 && (
        <>
          <div>
            <button onClick={() => toggleSection('tags')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
              <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-[#007e3a]" /> Tags</span>
              <div className="flex items-center gap-1.5">
                {filters.tags.length > 0 && (
                  <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                    {filters.tags.length}
                  </span>
                )}
                {expandedSections.tags ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </div>
            </button>
            {expandedSections.tags && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {(showAllTags ? tagOptions : tagOptions.slice(0, 6)).map(a => {
                  const idVal = a.uuid || a.id;
                  const isChecked = filters.tags.includes(idVal);
                  return (
                    <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                      <input type="checkbox" checked={isChecked}
                        onChange={() => { toggleArrayFilter('tags', idVal); setPage(1); }}
                        className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                      <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {a.name}
                      </span>
                    </label>
                  );
                })}
                {tagOptions.length > 6 && (
                  <button onClick={() => setShowAllTags(!showAllTags)}
                    className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full">
                    {showAllTags ? '− Show Less' : `+ Show ${tagOptions.length - 6} More`}
                  </button>
                )}
              </div>
            )}
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
        </>
      )}

      {mealPlanOptions.length > 0 && (
        <>
          <div>
            <button onClick={() => toggleSection('mealPlans')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
              <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-[#007e3a]" /> Meal Plans</span>
              <div className="flex items-center gap-1.5">
                {filters.mealPlans.length > 0 && (
                  <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                    {filters.mealPlans.length}
                  </span>
                )}
                {expandedSections.mealPlans ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </div>
            </button>
            {expandedSections.mealPlans && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {(showAllMealPlans ? mealPlanOptions : mealPlanOptions.slice(0, 6)).map(a => {
                  const idVal = a.key || a.uuid || a.id;
                  const isChecked = filters.mealPlans.includes(idVal);
                  return (
                    <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                      <input type="checkbox" checked={isChecked}
                        onChange={() => { toggleArrayFilter('mealPlans', idVal); setPage(1); }}
                        className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                      <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {a.label || a.name}
                      </span>
                    </label>
                  );
                })}
                {mealPlanOptions.length > 6 && (
                  <button onClick={() => setShowAllMealPlans(!showAllMealPlans)}
                    className="text-[11px] font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-1 text-left w-full">
                    {showAllMealPlans ? '− Show Less' : `+ Show ${mealPlanOptions.length - 6} More`}
                  </button>
                )}
              </div>
            )}
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
        </>
      )}

      {Object.keys(areasByDistrict).length > 0 && (
        <>
          <div>
            <button onClick={() => toggleSection('areas')} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2.5 hover:text-[#007e3a] transition-colors">
              <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#007e3a]" /> Areas</span>
              <div className="flex items-center gap-1.5">
                {(filters.areas?.length || 0) > 0 && (
                  <span className="text-[10px] font-bold bg-[#007e3a] text-white px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                    {filters.areas.length}
                  </span>
                )}
                {expandedSections.areas ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </div>
            </button>
            {expandedSections.areas && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {Object.entries(areasByDistrict).map(([district, areas]: [string, any]) => {
                  const isExpanded = expandedDistricts[district] !== false;
                  return (
                    <div key={district} className="space-y-1.5">
                      <button
                        onClick={() => setExpandedDistricts(prev => ({ ...prev, [district]: !isExpanded }))}
                        className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider transition-colors"
                      >
                        {district}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {isExpanded && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                          {areas.map((a: any) => {
                            const idVal = a.uuid;
                            const isChecked = filters.areas?.includes(idVal);
                            return (
                              <label key={idVal} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
                                <input type="checkbox" checked={isChecked}
                                  onChange={() => { toggleArrayFilter('areas', idVal); setPage(1); }}
                                  className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer" />
                                <span className={`text-xs transition-colors ${isChecked ? 'font-semibold text-[#007e3a] dark:text-[#38b26e]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                  {a.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
        </>
      )}

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
