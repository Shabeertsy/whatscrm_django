import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, ArrowLeft, Bed, MapPin, Users, CheckCircle2, ChevronRight, ChevronLeft, Share2, Check } from 'lucide-react';
import { hotelsApi } from '../api/hotels';
import { useHotelStore } from '../store/hotelStore';



export function HotelRooms() {
  const { id } = useParams<{ id: string }>();
  const selectedHotel = useHotelStore(state => state.selectedHotel);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [propertyData, setPropertyData] = useState<any>(selectedHotel || null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selection & UI states
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  // Filter states
  const [checkIn, setCheckIn] = useState('2026-07-04');
  const [checkOut, setCheckOut] = useState('2026-07-05');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomsCount, setRoomsCount] = useState(1);
  const [priceRange, setPriceRange] = useState([1000, 15000]);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const fetchRooms = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params = {
        property_uuid: id,
        check_in: checkIn,
        check_out: checkOut,
        adults: adults,
        children: children,
        rooms: roomsCount
      };

      const response = await hotelsApi.getRooms(params);
      const data = response.data || response;
      
      if (data) {
        // Merge the selectedHotel (which has images) with the new data
        let enhancedData = { ...selectedHotel, ...data };
        setPropertyData(enhancedData);
        let extractedRooms = data.rooms || data.results || (Array.isArray(data) ? data : []);
        
        // Apply price filter client-side
        extractedRooms = extractedRooms.filter((room: any) => {
          const roomPrice = room.price || room.grand_total || (room.price_summary && room.price_summary.grand_total) || 0;
          if (!roomPrice) return true; // If no price data, include it
          return roomPrice >= priceRange[0] && roomPrice <= priceRange[1];
        });
        
        setRooms(extractedRooms);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load room details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchRooms();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007e3a]"></div>
        <span className="text-sm font-medium text-slate-500">Loading property rooms...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/hotels" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hotels
        </Link>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      </div>
    );
  }


  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/hotels" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hotels
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {propertyData?.property_name || propertyData?.name || 'Hotel Details'}
            </h1>
            {propertyData?.location && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#007e3a]" />
                {propertyData.location.address || propertyData.location.name}
              </p>
            )}
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700 w-full md:w-max md:ml-auto">
            {/* Check In */}
            <div className="px-6 py-3.5 relative group min-w-[160px]">
              <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Check In</span>
              <div className="flex items-center justify-between">
                <input 
                  type="date" 
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  className="font-bold text-[15px] text-slate-900 dark:text-white bg-transparent focus:outline-none w-full cursor-pointer" 
                />
                {checkIn && (
                  <button onClick={() => setCheckIn('')} className="text-slate-400 hover:text-[#007e3a] transition-colors p-0.5 absolute right-4 bg-white dark:bg-slate-900">
                    <span className="text-lg font-black leading-none">&times;</span>
                  </button>
                )}
              </div>
            </div>

            {/* Check Out */}
            <div className="px-6 py-3.5 relative group min-w-[160px]">
              <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Check Out</span>
              <div className="flex items-center justify-between">
                <input 
                  type="date" 
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  className="font-bold text-[15px] text-slate-900 dark:text-white bg-transparent focus:outline-none w-full cursor-pointer" 
                />
                {checkOut && (
                  <button onClick={() => setCheckOut('')} className="text-slate-400 hover:text-[#007e3a] transition-colors p-0.5 absolute right-4 bg-white dark:bg-slate-900">
                    <span className="text-lg font-black leading-none">&times;</span>
                  </button>
                )}
              </div>
            </div>

            {/* Guests */}
            <div className="px-6 py-3.5 min-w-[180px] relative cursor-pointer" onClick={() => setShowGuestDropdown(!showGuestDropdown)}>
              <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Guests</span>
              <div className="inline-block text-[14px] font-bold text-slate-900 dark:text-white">
                {adults + children} Persons
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {adults} Adult, {children} Child, {roomsCount} Rooms
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
                        <button onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))} className="w-6 h-6 flex items-center justify-center border border-[#007e3a] text-[#007e3a] rounded text-lg hover:bg-green-50 transition-colors leading-none pb-0.5">-</button>
                        <span className="w-4 text-center font-semibold text-[13px] text-slate-900 dark:text-white">{roomsCount}</span>
                        <button onClick={() => setRoomsCount(roomsCount + 1)} className="w-6 h-6 flex items-center justify-center bg-[#007e3a] text-white rounded text-lg hover:bg-[#00602d] transition-colors leading-none pb-0.5">+</button>
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

            {/* Price Per Night */}
            <div className="px-6 py-3.5 min-w-[140px] relative cursor-pointer" onClick={() => setShowPriceDropdown(!showPriceDropdown)}>
              <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Price Per Night</span>
              <div className="text-[15px] font-bold text-slate-900 dark:text-white">
                ₹{priceRange[0]} - ₹{priceRange[1]}
              </div>

              {/* Price Dropdown */}
              {showPriceDropdown && (
                <div 
                  className="absolute top-[105%] right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-4 w-[240px] z-50 cursor-default"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Min Price (₹)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={priceRange[0]}
                        onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-[13px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Max Price (₹)</label>
                      <input 
                        type="number" 
                        min={priceRange[0]}
                        value={priceRange[1]}
                        onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-[13px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a]"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowPriceDropdown(false)}
                    className="w-full mt-5 bg-[#007e3a] hover:bg-[#00602d] text-white text-[13px] font-semibold py-2 rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Search Button */}
            <button 
              onClick={() => fetchRooms()}
              className="bg-[#007e3a] hover:bg-[#00602d] text-white text-[15px] font-bold w-full md:w-[140px] transition-colors md:rounded-r-lg cursor-pointer flex items-center justify-center py-4 md:py-0 focus:outline-none"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Property Images Gallery */}
      {propertyData?.images && propertyData.images.length > 0 && (
        <div className="relative w-full rounded-2xl mb-6 group">
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-3 h-48 md:h-[280px] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
          >
            {propertyData.images.map((img: any, idx: number) => (
              <div 
                key={img.uuid || idx} 
                className="h-full flex-shrink-0 snap-center w-[85%] sm:w-[60%] md:w-[45%] lg:w-[35%] relative rounded-xl overflow-hidden shadow-sm"
              >
                <img 
                  src={img.image || img.url || img} 
                  alt={`${propertyData.property_name || 'Property'} - ${idx + 1}`} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" 
                />
              </div>
            ))}
          </div>
          
          {/* Scroll Buttons */}
          <button 
            onClick={scrollLeft}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-white p-2.5 rounded-full shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white dark:hover:bg-slate-700 hover:scale-110 z-10 hidden md:flex items-center justify-center border border-slate-100 dark:border-slate-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={scrollRight}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-white p-2.5 rounded-full shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white dark:hover:bg-slate-700 hover:scale-110 z-10 hidden md:flex items-center justify-center border border-slate-100 dark:border-slate-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Property Info */}
        <div className="xl:col-span-1 space-y-6">
          {/* Highlights */}
          {propertyData?.highlights && propertyData.highlights.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" /> Property Highlights
              </h3>
              <ul className="space-y-3">
                {propertyData.highlights.map((highlight: any) => (
                  <li key={highlight.uuid} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{highlight.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular Amenities */}
          {propertyData?.popular_amenities && propertyData.popular_amenities.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Popular Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {propertyData.popular_amenities.map((amenity: any) => (
                  <span key={amenity.uuid} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {/* Map FontAwesome to Lucide if needed, or just show name */}
                    {amenity.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {propertyData?.rules && propertyData.rules.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Property Rules</h3>
              <div className="space-y-4">
                {propertyData.rules.slice(0, 3).map((ruleGroup: any) => (
                  <div key={ruleGroup.uuid}>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">{ruleGroup.name}</h4>
                    <ul className="space-y-1.5 pl-2">
                      {ruleGroup.rules.slice(0, 2).map((rule: any) => (
                        <li key={rule.uuid} className="text-xs text-slate-500 dark:text-slate-400 list-disc ml-3">
                          {rule.rule_text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Rooms List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bed className="h-5 w-5 text-[#007e3a]" /> Available Rooms
            </h2>
            <button 
              onClick={() => {
                // TODO: Add sharing functionality later
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-[#007e3a] hover:text-[#00602d] transition-colors bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800 shadow-sm"
            >
              <Share2 className="h-4 w-4" /> Share This Property
            </button>
          </div>
          
          {rooms.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <Bed className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No Rooms Available</h3>
              <p className="text-sm text-slate-500">Try adjusting your dates or guest counts to find availability.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rooms.map((room: any, index: number) => {
                const roomId = room.uuid || index.toString();
                const isSelected = selectedRoomIds.includes(roomId);
                return (
                <div 
                  key={room.uuid || index} 
                  className={`bg-white dark:bg-slate-900 rounded-xl border ${isSelected ? 'border-[#007e3a] shadow-md shadow-[#007e3a]/10' : 'border-slate-200 dark:border-slate-800 shadow-sm'} p-5 hover:shadow-md transition-all flex flex-col md:flex-row gap-6 relative`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-[#007e3a] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
                      Selected
                    </div>
                  )}
                  {/* Room Image */}
                  <div className="w-full md:w-48 h-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                    {room.room_images && room.room_images.length > 0 ? (
                      <img src={room.room_images[0].image || room.room_images[0].url} alt={room.name || 'Room'} className="w-full h-full object-cover" />
                    ) : room.image || room.thumbnail ? (
                      <img src={room.image || room.thumbnail} alt={room.name || 'Room'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Bed className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                  
                  {/* Room Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{room.name || room.title || 'Standard Room'}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {room.max_adults && (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Users className="h-3.5 w-3.5" /> Max {room.max_adults} Adults
                          </span>
                        )}
                        {room.bed_type && (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Bed className="h-3.5 w-3.5" /> {room.bed_type}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">
                        {room.description || 'Enjoy a comfortable stay in our beautifully appointed rooms with premium amenities.'}
                      </p>
                    </div>
                    
                    <div className="flex items-end justify-between mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div>
                        {room.price ? (
                          <>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">₹{room.price}</span>
                            <span className="text-xs text-slate-500 ml-1">/ night</span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-slate-900 dark:text-white">Price Unavailable</span>
                        )}
                      </div>
                      <button 
                        onClick={() => toggleRoomSelection(roomId)}
                        className={`${isSelected ? 'bg-white border-2 border-[#007e3a] text-[#007e3a]' : 'bg-[#007e3a] hover:bg-[#00662f] text-white border-2 border-transparent'} px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1.5`}
                      >
                        {isSelected ? (
                          <><Check className="h-4 w-4" /> Selected</>
                        ) : (
                          <>Select Room <ChevronRight className="h-4 w-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

// Add Star icon import since it's used
import { Star } from 'lucide-react';
export default HotelRooms;
