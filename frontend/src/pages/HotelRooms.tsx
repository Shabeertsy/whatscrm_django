import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bed, MapPin, Users, ChevronLeft, ChevronRight,
  Star, Tag, Info, CheckCircle2, Building2, Phone, Calendar, SlidersHorizontal, Share2
} from 'lucide-react';
import { hotelsApi } from '../api/hotels';
import { useHotelStore } from '../store/hotelStore';
import { useShareRoom } from '../features/hotels/hooks/useShareRoom';
import { ShareRoomModal } from '../features/hotels/components/ShareRoomModal';

export function HotelRooms() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromChat = location.state?.fromChat;
  const cachedRoom = useHotelStore(state => state.selectedHotel);
  const imgRef = useRef<HTMLDivElement>(null);

  const [room, setRoom] = useState<any>(cachedRoom || null);
  const [loading, setLoading] = useState(!cachedRoom);
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  // Filters (re-fetch room with new params)
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(
    cachedRoom?.price_summary?.check_in || today
  );
  const [checkOut, setCheckOut] = useState(
    cachedRoom?.price_summary?.check_out || tomorrow
  );
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [roomsCount, setRoomsCount] = useState(1);
  const [appliedRoomsCount, setAppliedRoomsCount] = useState(1);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const guestRef = useRef<HTMLDivElement>(null);

  const filters = { checkIn, checkOut, adults, children, rooms: roomsCount };
  const shareState = useShareRoom(filters);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) setShowGuestDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchRoom = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { adults, children, rooms_needed: roomsCount };
      if (checkIn) params.check_in = checkIn;
      if (checkOut) params.check_out = checkOut;

      // Use detail endpoint to get accurate pricing after rate check
      const res = await hotelsApi.getCrmRoomDetail(id, params);
      if (res.data) {
        setRoom(res.data);
        setAppliedRoomsCount(roomsCount);
      } else if (cachedRoom) {
        setRoom(cachedRoom);
      } else {
        setError('Room not found.');
      }
    } catch {
      setError('Failed to load room details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoom(); }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007e3a]" />
        <span className="text-sm text-slate-500">Loading room details...</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(fromChat ? '/messaging' : '/hotels')} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="h-4 w-4 mr-1" /> {fromChat ? 'Back to Chats' : 'Back to Rooms'}
        </button>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">{error || 'Room not found.'}</div>
      </div>
    );
  }

  const images: any[] = room.room_images || [];
  const summary = room.price_summary || {};
  const breakdown: any[] = room.price_breakdown || [];
  const amenities: any[] = room.amenities || [];

  return (
    <div className="space-y-6">
      {/* Back and Share */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(fromChat ? '/messaging' : '/hotels')} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" /> {fromChat ? 'Back to Chats' : 'Back to Rooms'}
        </button>
        <button
          onClick={() => shareState.setSelectedShareRoom(room)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#007e3a]/10 hover:bg-[#007e3a]/20 text-[#007e3a] rounded-lg text-sm font-bold transition-colors"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

      {/* Search / Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
          {/* Check In */}
          <div className="px-5 py-3.5 flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check In</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
              className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full cursor-pointer" />
          </div>
          {/* Check Out */}
          <div className="px-5 py-3.5 flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check Out</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
              className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full cursor-pointer" />
          </div>
          {/* Guests */}
          <div className="px-5 py-3.5 flex-1 relative cursor-pointer" ref={guestRef} onClick={() => setShowGuestDropdown(v => !v)}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 cursor-pointer">Guests</label>
            <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{adults + children} Persons</div>
            <div className="text-[10px] text-slate-400">{adults} Adult · {children} Child · {roomsCount} Room</div>
            {showGuestDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 w-[220px] z-50" onClick={e => e.stopPropagation()}>
                {[
                  { label: 'Adults', val: adults, min: 1, set: setAdults },
                  { label: 'Children', val: children, min: 0, set: setChildren },
                  { label: 'Rooms', val: roomsCount, min: 1, set: setRoomsCount },
                ].map(({ label, val, min, set }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => set(v => Math.max(min, v - 1))} className="w-7 h-7 flex items-center justify-center border border-[#007e3a] text-[#007e3a] rounded-lg hover:bg-green-50 transition-colors font-bold">−</button>
                      <span className="w-5 text-center font-bold text-[13px] text-slate-900 dark:text-white">{val}</span>
                      <button onClick={() => set(v => v + 1)} className="w-7 h-7 flex items-center justify-center bg-[#007e3a] text-white rounded-lg hover:bg-[#00602d] transition-colors font-bold">+</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setShowGuestDropdown(false); }} className="w-full mt-3 bg-[#007e3a] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#00602d] transition-colors">Apply</button>
              </div>
            )}
          </div>
          {/* Search Button */}
          <button onClick={fetchRoom} className="bg-[#007e3a] hover:bg-[#00602d] text-white font-bold text-sm px-8 py-4 md:rounded-r-xl transition-colors flex items-center gap-2 justify-center">
            <SlidersHorizontal className="h-4 w-4" /> Check Rates
          </button>
        </div>
      </div>

      {/* Room Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{room.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {room.room_type && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#007e3a]/10 text-[#007e3a] px-3 py-1 rounded-full">
                <Bed className="h-3 w-3" /> {room.room_type.name}
              </span>
            )}
            {room.property_type && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full">
                <Building2 className="h-3 w-3" /> {room.property_type.name}
              </span>
            )}
            {(room.availability ? room.availability.available : room.status === 'available') ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border bg-red-100 text-red-700 border-red-200">
                <CheckCircle2 className="h-3 w-3" /> {room.availability?.message || 'Not Available'}
              </span>
            )}
          </div>
        </div>
        {/* Price Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm text-right min-w-[200px]">
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ₹{(summary.grand_total ?? room.grand_total ?? room.price)?.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {summary.nights ? `${summary.nights} night${summary.nights > 1 ? 's' : ''} · ` : ''}
            {summary.check_in && summary.check_out ? `${summary.check_in} → ${summary.check_out}` : 'per night'}
          </div>
          {summary.gst_amount > 0 && (
            <div className="text-xs text-slate-400 mt-1">Incl. GST ₹{summary.gst_amount?.toLocaleString()} ({summary.gst_pct}%)</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Images + Details */}
        <div className="xl:col-span-2 space-y-6">

          {/* Image Gallery */}
          {images.length > 0 ? (
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: 300 }}>
              <img src={images[imgIdx]?.url || images[imgIdx]?.image} alt={room.name}
                className="w-full h-full object-cover transition-all duration-500" />
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-md hover:scale-110 transition">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-md hover:scale-110 transition">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_: any, i: number) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={`h-2 rounded-full transition-all ${i === imgIdx ? 'w-5 bg-white' : 'w-2 bg-white/50'}`} />
                    ))}
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/40 to-transparent">
                      {images.map((img: any, i: number) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={`h-12 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${i === imgIdx ? 'border-white' : 'border-transparent opacity-60'}`}>
                          <img src={img.url || img.image} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 h-48 flex items-center justify-center">
              <Bed className="h-12 w-12 text-slate-300" />
            </div>
          )}

          {/* Room Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Base Occupancy', val: `${room.base_occupancy} Guests`, icon: <Users className="h-4 w-4" /> },
              { label: 'Max Occupancy', val: `${room.max_occupancy} Guests`, icon: <Users className="h-4 w-4" /> },
              { label: 'Room Number', val: room.room_number ? `#${room.room_number}` : '—', icon: <Bed className="h-4 w-4" /> },
              { label: 'Base Price', val: `₹${parseFloat((room.price_breakdown?.[0]?.base_price ?? room.base_price) || 0).toLocaleString()}`, icon: <Tag className="h-4 w-4" /> },
            ].map(({ label, val, icon }) => (
              <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-[#007e3a] mb-2">{icon}</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{val}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {room.description && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-[#007e3a]" /> Description
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{room.description}</p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-[#007e3a]" /> Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a: any) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                    <i className={`fa ${a.icon} text-[#007e3a]`} style={{ fontSize: 11 }} />
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          {breakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#007e3a]" /> Price Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-600 dark:text-slate-400">
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-2 text-left">Date</th>
                      <th className="pb-2 text-right">Base Price</th>
                      {(room?.extra_adults_count > 0) && <th className="pb-2 text-right">Extra Adults</th>}
                      {(room?.children_count > 0) && <th className="pb-2 text-right">Children</th>}
                      <th className="pb-2 text-right">Markup</th>
                      <th className="pb-2 text-right">GST</th>
                      <th className="pb-2 text-right font-bold text-slate-700 dark:text-slate-200">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {breakdown.map((b: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2">{b.date}</td>
                        <td className="py-2 text-right">₹{b.base_price?.toLocaleString()}</td>
                        {(room?.extra_adults_count > 0) && <td className="py-2 text-right">₹{b.extra_adult_charge?.toLocaleString() ?? 0}</td>}
                        {(room?.children_count > 0) && <td className="py-2 text-right">₹{b.child_charge?.toLocaleString() ?? 0}</td>}
                        <td className="py-2 text-right">₹{b.markup_amount?.toLocaleString()}</td>
                        <td className="py-2 text-right">₹{b.gst_amount?.toLocaleString()}</td>
                        <td className="py-2 text-right font-bold text-slate-800 dark:text-white">₹{b.total_with_gst?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Property Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#007e3a]" /> Property Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{room.owner_username || room.owner_brand_name}</p>
                  <p className="text-xs text-slate-400">{room.property_type?.name}</p>
                </div>
              </div>
              {room.property_location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{room.property_location.name}</p>
                    <p className="text-xs text-slate-400">{room.property_location.city}, {room.property_location.state}</p>
                  </div>
                </div>
              )}
              {room.owner_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 text-xs">{room.owner_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#007e3a]" /> Pricing Summary
              </span>
              {(summary.nights ?? 0) > 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                  {summary.nights} night{summary.nights > 1 ? 's' : ''}, {appliedRoomsCount} room{appliedRoomsCount > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <div className="space-y-2.5 text-sm">
              {[
                { 
                  label: 'Avg. per night', 
                  val: (() => {
                    const included = [];
                    if (parseFloat(room?.markup_amount ?? 0) > 0) included.push('markup');
                    if (parseFloat(room?.extra_adult_charge ?? 0) > 0) included.push('extra adults');
                    if (parseFloat(room?.child_charge ?? 0) > 0) included.push('children');
                    
                    return included.length > 0 ? (
                      <div className="flex flex-col items-end leading-tight">
                        <span>₹{summary.avg_per_night?.toLocaleString() ?? '—'}</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">(incl. {included.join(', ')})</span>
                      </div>
                    ) : `₹${summary.avg_per_night?.toLocaleString() ?? '—'}`;
                  })()
                },
                (room?.extra_adults_count > 0) && { label: 'Extra Adults', val: room.extra_adults_count },
                (room?.children_count > 0) && { label: 'Children', val: room.children_count },
                { label: `Subtotal (${summary.nights ?? '?'} night${(summary.nights ?? 0) > 1 ? 's' : ''})`, val: `₹${summary.subtotal?.toLocaleString() ?? '—'}` },
                { label: `GST (${summary.gst_pct ?? 0}%)`, val: `₹${summary.gst_amount?.toLocaleString() ?? '0'}` },
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>{row.label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{row.val}</span>
                </div>
              ))}
              <hr className="border-slate-100 dark:border-slate-800" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white">Grand Total</span>
                <span className="font-black text-lg text-[#007e3a]">₹{(summary.grand_total ?? room.grand_total)?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Extra Charges Info */}
          {(parseFloat(room.price_breakdown?.[0]?.extra_adult_price ?? room.extra_adult_price) > 0 || parseFloat(room.price_breakdown?.[0]?.child_price ?? room.child_price) > 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-wider">Extra Charges</h3>
              <div className="space-y-1.5 text-xs text-amber-700 dark:text-amber-300">
                {parseFloat(room.price_breakdown?.[0]?.extra_adult_price ?? room.extra_adult_price) > 0 && (
                  <div className="flex justify-between"><span>Extra Adult</span><span className="font-bold">₹{parseFloat(room.price_breakdown?.[0]?.extra_adult_price ?? room.extra_adult_price).toLocaleString()}</span></div>
                )}
                {parseFloat(room.price_breakdown?.[0]?.child_price ?? room.child_price) > 0 && (
                  <div className="flex justify-between"><span>Child</span><span className="font-bold">₹{parseFloat(room.price_breakdown?.[0]?.child_price ?? room.child_price).toLocaleString()}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Book Button removed as per request */}
        </div>
      </div>
      <ShareRoomModal {...shareState} filters={filters} />
    </div>
  );
}

export default HotelRooms;
