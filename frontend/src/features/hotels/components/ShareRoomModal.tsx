import React from 'react';
import { X, Bed, ChevronRight, ChevronLeft, Search, Share2 } from 'lucide-react';
import { generateShareText } from '../utils/generateShareText';



interface ShareRoomModalProps {
  selectedShareRoom: any;
  shareOptions: Record<string, boolean>;
  setShareOptions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedShareCategory: string | null;
  setExpandedShareCategory: (val: string | null) => void;
  shareStep: 'options' | 'select_chats';
  setShareStep: (val: 'options' | 'select_chats') => void;
  selectedChats: string[];
  setSelectedChats: React.Dispatch<React.SetStateAction<string[]>>;
  isSendingShare: boolean;
  chatSearchTerm: string;
  setChatSearchTerm: (val: string) => void;
  filteredConversations: any[];
  loadConversations: () => void;
  handleSendShare: () => void;
  closeShare: () => void;
  filters?: any;
  amenityOptions?: any[];
  propertyTypeOptions?: any[];
}


export function ShareRoomModal({
  selectedShareRoom, shareOptions, setShareOptions, expandedShareCategory, setExpandedShareCategory,
  shareStep, setShareStep, selectedChats, setSelectedChats, isSendingShare,
  chatSearchTerm, setChatSearchTerm, filteredConversations, loadConversations, handleSendShare, closeShare,
  filters, amenityOptions, propertyTypeOptions
}: ShareRoomModalProps) {
  if (!selectedShareRoom) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={closeShare}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {shareStep === 'options' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Share Room</h3>
            <button onClick={closeShare} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-6">Share this room's details with others.</p>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Bed className="h-5 w-5 text-[#007e3a]" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedShareRoom.name}</span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {selectedShareRoom.owner_username || selectedShareRoom.owner_brand_name} • {selectedShareRoom.property_location?.city}
            </div>
          </div>

          <div className="mb-6 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 pb-2 z-10">Include in Message</p>
            <div className="space-y-2">
              {(() => {
                const searchFilterItems = [];
                if (filters) {
                  if (filters.checkIn || filters.checkOut) {
                    searchFilterItems.push({ subKey: 'filters_dates', label: `Dates: ${filters.checkIn || 'Any'} to ${filters.checkOut || 'Any'}` });
                  }
                  if (filters.adults || filters.children) {
                    searchFilterItems.push({ subKey: 'filters_guests', label: `Guests: ${filters.adults || 1} Adults, ${filters.children || 0} Children` });
                  }
                  if (filters.rooms) {
                    searchFilterItems.push({ subKey: 'filters_rooms', label: `Rooms Needed: ${filters.rooms}` });
                  }
                }

                const shareItemsList: any[] = [];
                
                // 1. Basic Room Details
                shareItemsList.push({ key: 'basicDetails', label: 'Basic Room Details', subItems: [
                    { subKey: 'basicDetails_roomName', label: 'Room Name: ' + selectedShareRoom.name },
                    { subKey: 'basicDetails_roomType', label: 'Room Type: ' + (selectedShareRoom.room_type?.name || 'N/A') },
                    { subKey: 'basicDetails_occupancy', label: `Max Occupancy: ${selectedShareRoom.max_occupancy} Guests` },
                    { subKey: 'basicDetails_amenities', label: 'Amenities: ' + (selectedShareRoom.amenities?.map((a: any) => a.name).join(', ') || 'None') }
                ]});

                if (searchFilterItems.length > 0) {
                  shareItemsList.push({ key: 'searchFilters', label: 'Search Requirements', subItems: searchFilterItems });
                }

                // 2. Property Details (Owner/Brand/Property Type etc)
                shareItemsList.push(
                  { key: 'propertyDetails', label: 'Property Details', subItems: [
                      { subKey: 'propertyDetails_name', label: 'Property Name: ' + (selectedShareRoom.owner_brand_name || selectedShareRoom.owner_username || 'N/A') },
                      { subKey: 'propertyDetails_type', label: 'Property Type: ' + (selectedShareRoom.property_type?.name || 'N/A') }
                  ]});
                
                // 3. Price
                const nights = selectedShareRoom.price_summary?.nights || 1;
                const roomsCount = filters?.rooms || 1;
                shareItemsList.push(
                  { key: 'price', label: 'Price', subItems: [
                      { subKey: 'price_amount', label: `Amount: ₹${(selectedShareRoom.price_summary?.grand_total ?? selectedShareRoom.grand_total ?? selectedShareRoom.price)?.toLocaleString()} (for ${nights} night${nights > 1 ? 's' : ''}, ${roomsCount} room${roomsCount > 1 ? 's' : ''})` }
                  ]});

                // 4. Location
                shareItemsList.push(
                  { key: 'location', label: 'Location', subItems: [
                      { subKey: 'location_city', label: `City: ${selectedShareRoom.property_location?.city || 'N/A'}` },
                      { subKey: 'location_state', label: `State: ${selectedShareRoom.property_location?.state || 'N/A'}` }
                  ]});

                // 5. Contact Details
                shareItemsList.push(
                  { key: 'contactDetails', label: 'Contact Details', subItems: [
                      { subKey: 'contactDetails_phone', label: `Phone: ${selectedShareRoom.owner_phone || 'N/A'}` }
                  ]});

                // 6. Room Images
                const roomImgs = selectedShareRoom.room_images || [];
                shareItemsList.push({ 
                    key: 'images_room', 
                    label: 'Room Images', 
                    subItems: roomImgs.map((img: any, i: number) => ({
                        subKey: `images_room_${i}`, label: `Image ${i + 1}: ${img.url || img.image}`
                    })),
                    emptyMessage: roomImgs.length === 0 ? 'No media available' : undefined
                });

                // 7. Property Images
                const propImages = selectedShareRoom.property_details?.property_images || selectedShareRoom.property_images || selectedShareRoom.property?.images || [];
                shareItemsList.push({ 
                    key: 'images_property', 
                    label: 'Property Images', 
                    subItems: propImages.map((img: any, i: number) => ({
                        subKey: `images_property_${i}`, label: `Image ${i + 1}: ${img.url || img.image}`
                    })),
                    emptyMessage: propImages.length === 0 ? 'No media available' : undefined
                });

                // 8. Property Videos
                const propVideos = selectedShareRoom.property_details?.property_videos || selectedShareRoom.property_videos || selectedShareRoom.property?.videos || [];
                shareItemsList.push({ 
                    key: 'videos_property', 
                    label: 'Property Videos', 
                    subItems: propVideos.map((vid: any, i: number) => ({
                        subKey: `videos_property_${i}`, label: `Video ${i + 1}: ${vid.video || vid.url}`
                    })),
                    emptyMessage: propVideos.length === 0 ? 'No media available' : undefined
                });

                return shareItemsList.map(opt => (
                <div key={opt.key} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50">
                    <label className="flex items-center gap-2 cursor-pointer group flex-1">
                      <input 
                        type="checkbox" 
                        checked={!!shareOptions[opt.key]} 
                        onChange={e => {
                          const isChecked = e.target.checked;
                          setShareOptions(prev => {
                            const newOpts = { ...prev, [opt.key]: isChecked };
                            if (opt.subItems) {
                              opt.subItems.forEach((sub: any) => {
                                newOpts[sub.subKey] = isChecked;
                              });
                            }
                            return newOpts;
                          });
                        }}
                        className="h-4 w-4 rounded accent-[#007e3a] cursor-pointer" 
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {opt.label}
                      </span>
                    </label>
                    {(opt.subItems.length > 0 || opt.emptyMessage) && (
                      <button 
                        onClick={() => setExpandedShareCategory(expandedShareCategory === opt.key ? null : opt.key)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedShareCategory === opt.key ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                  {expandedShareCategory === opt.key && (opt.subItems.length > 0 || opt.emptyMessage) && (
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      {opt.emptyMessage ? (
                         <div className="text-[13px] text-slate-400 italic px-1 py-0.5">{opt.emptyMessage}</div>
                      ) : (
                        opt.subItems.map((sub: any) => (
                        <label key={sub.subKey} className="flex items-start gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={!!shareOptions[sub.subKey]} 
                            onChange={e => {
                              const isChecked = e.target.checked;
                              setShareOptions(prev => {
                                const newOpts = { ...prev, [sub.subKey]: isChecked };
                                const anyChecked = opt.subItems.some((s: any) => 
                                  s.subKey === sub.subKey ? isChecked : !!prev[s.subKey]
                                );
                                newOpts[opt.key] = anyChecked;
                                return newOpts;
                              });
                            }}
                            className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer mt-0.5 flex-shrink-0" 
                          />
                          <span className="text-[13px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors break-all leading-tight">
                            {sub.label}
                          </span>
                        </label>
                      )))}
                    </div>
                  )}
                </div>
              ))})()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const text = generateShareText(selectedShareRoom, shareOptions, filters, amenityOptions, propertyTypeOptions);
                navigator.clipboard.writeText(text);
                alert('Message copied to clipboard!');
              }}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Copy Text
            </button>
            <button 
              onClick={loadConversations}
              className="flex-1 bg-[#007e3a] hover:bg-[#00602d] text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" /> Share to Chats
            </button>
          </div>
        </div>
        )}

        {shareStep === 'select_chats' && (
          <div className="p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setShareStep('options')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Chats</h3>
            </div>

            <div className="mb-4 relative flex-shrink-0">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={chatSearchTerm}
                onChange={e => setChatSearchTerm(e.target.value)}
                placeholder="Search name or phone..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] mb-6 space-y-2 custom-scrollbar pr-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  {chatSearchTerm ? "No chats match your search." : "No active conversations found."}
                </div>
              ) : (
                filteredConversations.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedChats.includes(c.id) ? 'border-[#007e3a] bg-[#007e3a]/5 dark:bg-[#007e3a]/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedChats.includes(c.id)} 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedChats(p => [...p, c.id]);
                        else setSelectedChats(p => p.filter(id => id !== c.id));
                      }} 
                      className="h-4 w-4 accent-[#007e3a] cursor-pointer"
                    />
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                      {c.contact.profile_pic_url ? (
                        <img src={c.contact.profile_pic_url} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {(c.contact.name || c.contact.phone).substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.contact.name || c.contact.phone}</p>
                        {c.contact.name && <p className="text-xs text-slate-500 truncate">{c.contact.phone}</p>}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <button 
              disabled={isSendingShare || selectedChats.length === 0}
              onClick={handleSendShare}
              className="w-full bg-[#007e3a] hover:bg-[#00602d] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isSendingShare ? (
                <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Sending...</>
              ) : (
                <>Send to {selectedChats.length} Chat{selectedChats.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
