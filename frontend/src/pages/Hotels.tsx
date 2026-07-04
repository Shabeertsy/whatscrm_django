import React, { useEffect, useState, useCallback } from 'react';
import { Building2, Search, MapPin, Star, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { hotelsApi } from '../api/hotels';
import { useRouter } from '../router';
import { useHotelStore } from '../store/hotelStore';

export function Hotels() {
  const { navigate } = useRouter();
  const setSelectedHotel = useHotelStore(state => state.setSelectedHotel);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search State
  const [checkIn, setCheckIn] = useState('2026-07-04');
  const [checkOut, setCheckOut] = useState('2026-07-05');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [priceMax, setPriceMax] = useState(15000);
  
  // Track last successful search for banner
  const [lastSearched, setLastSearched] = useState<{checkIn: string, checkOut: string, adults: number, rooms: number} | null>({ checkIn: '2026-07-04', checkOut: '2026-07-05', adults: 2, rooms: 1 });
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Side Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  
  const PROPERTY_TYPE_OPTIONS = ['Apartment', 'Homestay', 'Hotel', 'Lodge', 'Private pool', 'Resort', 'Villa'];
  const AMENITY_OPTIONS = ['Garden', 'Parking', 'WiFi', 'Swimming Pool', 'Restaurant', 'Spa'];
  
  // Mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  
  // Sidebar expanded lists toggle
  const [showAllPropertyTypes, setShowAllPropertyTypes] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const fetchHotels = useCallback(async (isSearchAction = false) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: 9,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        rooms
      };

      if (priceMax < 20000) params.max_price = priceMax;
      if (searchTerm) params.search = searchTerm;
      if (propertyTypes.length > 0) params.property_type = propertyTypes.join(',');
      if (amenities.length > 0) params.amenities = amenities.join(',');

      const response = await hotelsApi.getHotels(params);
      
      const data = response.data?.properties || response.data?.data || response.data?.results || response.data || [];
      if (Array.isArray(data)) {
        setHotels(data);
      } else {
        setHotels(Object.values(data).filter(item => typeof item === 'object' && item !== null));
      }
      
      if (response.data?.total_pages) {
        setTotalPages(response.data.total_pages);
      }

      if (isSearchAction) {
        setLastSearched({ checkIn, checkOut, adults, rooms });
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load hotels. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [page, checkIn, checkOut, adults, children, rooms, priceMax, searchTerm, propertyTypes, amenities]);

  // Initial fetch only on mount and page change
  useEffect(() => {
    fetchHotels();
  }, [page, propertyTypes, amenities]); 

  // Debounced search for side filters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') fetchHotels();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchHotels]);

  const handleTypeToggle = (type: string) => {
    setPropertyTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const handleAmenityToggle = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
    setPage(1);
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#007e3a]" />
            Hotels and Resorts
          </h1>
        </div>
        

        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"
        >
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}



      {/* Booking Style Search Filter */}
      <div className={`w-full md:w-max md:ml-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
          
          {/* Search Location */}
          <div className="flex-1 px-6 py-3.5 relative group">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">City, Property name or Location</label>
            <div className="flex items-center justify-between">
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search Location"
                className="font-semibold text-[13px] text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full" 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-[#007e3a] opacity-0 group-hover:opacity-100 transition-colors p-0.5 absolute right-2 bg-white dark:bg-slate-900">
                  <span className="text-sm font-black leading-none">&times;</span>
                </button>
              )}
            </div>
          </div>

          {/* Check In */}
          <div className="flex-1 px-6 py-3.5 relative group border-t md:border-t-0">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Check In</label>
            <div className="flex items-center justify-between">
              <input 
                type="date" 
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className="font-semibold text-[13px] text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full cursor-pointer" 
              />
              {checkIn && (
                <button onClick={() => setCheckIn('')} className="text-slate-400 hover:text-[#007e3a] opacity-0 group-hover:opacity-100 transition-colors p-0.5 absolute right-8 bg-white dark:bg-slate-900">
                  <span className="text-sm font-black leading-none">&times;</span>
                </button>
              )}
            </div>
          </div>

          {/* Check Out */}
          <div className="flex-1 px-6 py-3.5 relative group border-t md:border-t-0">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Check Out</label>
            <div className="flex items-center justify-between">
              <input 
                type="date" 
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                className="font-semibold text-[13px] text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full cursor-pointer" 
              />
              {checkOut && (
                <button onClick={() => setCheckOut('')} className="text-slate-400 hover:text-[#007e3a] opacity-0 group-hover:opacity-100 transition-colors p-0.5 absolute right-8 bg-white dark:bg-slate-900">
                  <span className="text-sm font-black leading-none">&times;</span>
                </button>
              )}
            </div>
          </div>

          {/* Guests */}
          <div className="flex-1 px-6 py-3.5 border-t md:border-t-0 relative cursor-pointer" onClick={() => setShowGuestDropdown(!showGuestDropdown)}>
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Guests</label>
            <div className="inline-block bg-[#007e3a] text-white px-2 py-0.5 rounded text-[12px] font-semibold">
              {adults + children} Persons
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {adults} Adult, {rooms} Room
            </div>

            {/* Guest Dropdown */}
            {showGuestDropdown && (
              <div 
                className="absolute top-[105%] left-0 md:-left-4 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-4 w-[220px] z-50 cursor-default"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-3">
                  {/* Adults */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-slate-700 dark:text-slate-300">Adults</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-6 h-6 flex items-center justify-center border border-[#007e3a] text-[#007e3a] rounded text-lg hover:bg-green-50 transition-colors leading-none pb-0.5">-</button>
                      <span className="w-4 text-center font-semibold text-[13px] text-slate-900 dark:text-white">{adults}</span>
                      <button onClick={() => setAdults(adults + 1)} className="w-6 h-6 flex items-center justify-center bg-[#007e3a] text-white rounded text-lg hover:bg-[#00602d] transition-colors leading-none pb-0.5">+</button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-slate-700 dark:text-slate-300">Children</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setChildren(Math.max(0, children - 1))} className="w-6 h-6 flex items-center justify-center border border-[#007e3a] text-[#007e3a] rounded text-lg hover:bg-green-50 transition-colors leading-none pb-0.5">-</button>
                      <span className="w-4 text-center font-semibold text-[13px] text-slate-900 dark:text-white">{children}</span>
                      <button onClick={() => setChildren(children + 1)} className="w-6 h-6 flex items-center justify-center bg-[#007e3a] text-white rounded text-lg hover:bg-[#00602d] transition-colors leading-none pb-0.5">+</button>
                    </div>
                  </div>

                  {/* Rooms */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-slate-700 dark:text-slate-300">Rooms</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="w-6 h-6 flex items-center justify-center border border-[#007e3a] text-[#007e3a] rounded text-lg hover:bg-green-50 transition-colors leading-none pb-0.5">-</button>
                      <span className="w-4 text-center font-semibold text-[13px] text-slate-900 dark:text-white">{rooms}</span>
                      <button onClick={() => setRooms(rooms + 1)} className="w-6 h-6 flex items-center justify-center bg-[#007e3a] text-white rounded text-lg hover:bg-[#00602d] transition-colors leading-none pb-0.5">+</button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowGuestDropdown(false)}
                  className="w-full mt-4 bg-[#007e3a] hover:bg-[#00602d] text-white text-[13px] font-semibold py-2 rounded transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Search Button */}
          <div className="px-5 py-3.5 flex items-center justify-center border-t md:border-t-0 bg-white dark:bg-slate-900">
            <button 
              onClick={() => { setPage(1); fetchHotels(true); }}
              className="bg-[#007e3a] hover:bg-[#00602d] text-white text-[13px] font-semibold rounded px-8 py-3 w-full md:w-auto transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {lastSearched && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-green-800 dark:text-green-400 gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>
              Showing availability for <span className="font-bold">{new Date(lastSearched.checkIn).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span> &rarr; <span className="font-bold">{new Date(lastSearched.checkOut).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span> &middot; <span className="font-bold">{lastSearched.adults}A {lastSearched.rooms}R</span>
            </span>
          </div>
          <button onClick={() => { setLastSearched(null); /* optional: reset filters here */ }} className="px-3 py-1 bg-white dark:bg-transparent border border-green-300 dark:border-green-700 rounded-full text-xs font-medium hover:bg-green-100 dark:hover:bg-green-800/50 transition whitespace-nowrap">
            Clear
          </button>
        </div>
      )}

      {/* Main Layout Split */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Side Filters Sidebar */}
        <div className={`w-full lg:w-64 flex-shrink-0 space-y-6 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          
          {/* Search by Name */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-[#007e3a]" /> Search by Name
            </h3>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Hotel name or brand..." 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#007e3a] focus:border-transparent dark:text-white"
            />
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Price Range */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-[#007e3a] border border-[#007e3a] rounded-full w-4 h-4 flex items-center justify-center text-[10px]">₹</span> Price Per Night
            </h3>
            <div className="px-2">
              <input 
                type="range" 
                min="0" 
                max="20000" 
                step="500"
                value={priceMax}
                onChange={(e) => { setPriceMax(Number(e.target.value)); setPage(1); }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#007e3a]"
              />
            </div>
            <div className="text-center text-xs text-slate-500 font-medium">
              Range: ₹0 - ₹{priceMax}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Property Type */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#007e3a]" /> Property Type
              </span>
            </h3>
            <div className="space-y-2.5">
              {(showAllPropertyTypes ? PROPERTY_TYPE_OPTIONS : PROPERTY_TYPE_OPTIONS.slice(0, 5)).map(type => (
                <label key={type} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={propertyTypes.includes(type)}
                      onChange={() => handleTypeToggle(type)}
                      className="peer h-4 w-4 rounded border-slate-300 text-[#007e3a] focus:ring-[#007e3a]" 
                    />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{type}</span>
                </label>
              ))}
              {PROPERTY_TYPE_OPTIONS.length > 5 && (
                <button 
                  onClick={() => setShowAllPropertyTypes(!showAllPropertyTypes)}
                  className="text-xs font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-2 block"
                >
                  {showAllPropertyTypes ? '- Show less' : `+ ${PROPERTY_TYPE_OPTIONS.length - 5} more options`}
                </button>
              )}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Amenities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#007e3a]" /> Amenities
              </span>
            </h3>
            <div className="space-y-2.5">
              {(showAllAmenities ? AMENITY_OPTIONS : AMENITY_OPTIONS.slice(0, 5)).map(amenity => (
                <label key={amenity} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="peer h-4 w-4 rounded border-slate-300 text-[#007e3a] focus:ring-[#007e3a]" 
                    />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{amenity}</span>
                </label>
              ))}
              {AMENITY_OPTIONS.length > 5 && (
                <button 
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="text-xs font-semibold text-[#007e3a] hover:text-[#00602d] transition-colors mt-2 block"
                >
                  {showAllAmenities ? '- Show less' : `+ ${AMENITY_OPTIONS.length - 5} more options`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 min-w-0 flex flex-col space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Property</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr className="h-[600px]">
                      <td colSpan={6} className="text-center text-slate-500">
                        <div className="flex flex-col justify-center items-center space-y-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007e3a]"></div>
                          <span className="text-sm font-medium">Loading properties...</span>
                        </div>
                      </td>
                    </tr>
                  ) : hotels.length === 0 && !error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        <span className="text-sm font-medium text-slate-600">No properties found for the selected criteria.</span>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search term.</p>
                      </td>
                    </tr>
                  ) : (
                    hotels.map((hotel, index) => (
                      <tr key={hotel.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                          {hotel.images && hotel.images.length > 0 ? (
                            <img src={hotel.images[0].image || hotel.images[0].url || hotel.images[0]} alt={hotel.owner_name} className="h-10 w-10 rounded object-cover border border-slate-200 dark:border-slate-700 bg-slate-100" />
                          ) : hotel.cover_image || hotel.thumbnail || hotel.image ? (
                            <img src={hotel.cover_image || hotel.thumbnail || hotel.image} alt={hotel.owner_name} className="h-10 w-10 rounded object-cover border border-slate-200 dark:border-slate-700 bg-slate-100" />
                          ) : (
                            <div className="h-10 w-10 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="truncate max-w-[180px] group-hover:text-[#007e3a] transition-colors">{hotel.owner_name || hotel.name || hotel.title || 'Unknown Property'}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{hotel.property_type || 'Property'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate max-w-[160px]">{hotel.location?.city || hotel.location?.name || 'N/A'}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate max-w-[160px] ml-5">{hotel.location?.state}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">
                              {hotel.rating || hotel.stars || '4.5'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          {hotel.min_price ? `₹${hotel.min_price}` : 'Check Rates'}
                          {hotel.min_price && <span className="block text-[10px] text-slate-400 font-normal">per night</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${hotel.has_availability ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                            {hotel.has_availability ? `${hotel.available_rooms} Left` : 'Sold Out'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedHotel(hotel);
                              navigate(`/hotels/${hotel.uuid || hotel.id}`);
                            }}
                            className="text-[#007e3a] hover:text-white font-bold text-xs bg-[#007e3a]/10 hover:bg-[#007e3a] px-4 py-2 rounded-lg transition-all duration-200"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && hotels.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="text-xs text-slate-500 font-medium">
                  Showing page <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hotels;
