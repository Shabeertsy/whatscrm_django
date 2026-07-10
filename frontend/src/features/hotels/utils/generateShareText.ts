export function generateShareText(
  room: any, 
  options: Record<string, boolean>,
  filters?: any,
  amenityOptions?: any[],
  propertyTypeOptions?: any[]
) {
  if (!room) return '';
  let text = '';

  if (options.basicDetails) {
    if (options.basicDetails_roomName) text += `*${room.name}*\n`;
    if (options.basicDetails_roomType) text += `*Room Type:* ${room.room_type?.name || 'N/A'}\n`;
    if (options.basicDetails_occupancy) text += `*Max Occupancy:* ${room.max_occupancy} Guests\n`;
    if (options.basicDetails_amenities && room.amenities?.length > 0) {
      const aNames = room.amenities.map((a: any) => a.name).join(', ');
      text += `*Amenities:* ${aNames}\n`;
    }
    if (options.basicDetails_roomName || options.basicDetails_roomType || options.basicDetails_occupancy || options.basicDetails_amenities) {
      text += '\n';
    }
  }

  if (options.searchFilters && filters) {
    const filterParts = [];
    if (options.filters_dates && (filters.checkIn || filters.checkOut)) {
      filterParts.push(`Dates: ${filters.checkIn || 'Any'} to ${filters.checkOut || 'Any'}`);
    }
    if (options.filters_guests && (filters.adults || filters.children)) {
      filterParts.push(`Guests: ${filters.adults || 1} Adults, ${filters.children || 0} Children`);
    }
    if (options.filters_rooms && filters.rooms) {
      filterParts.push(`Rooms Needed: ${filters.rooms}`);
    }
    if (filterParts.length > 0) {
      text += `*Requirements:*\n${filterParts.join('\n')}\n\n`;
    }
  }

  if (options.propertyDetails) {
    if (options.propertyDetails_name) text += `*Property Name:* ${room.owner_brand_name || room.owner_username || 'N/A'}\n`;
    if (options.propertyDetails_type) text += `*Property Type:* ${room.property_type?.name || 'N/A'}\n`;
    if (options.propertyDetails_name || options.propertyDetails_type) text += '\n';
  }
  
  if (options.price && options.price_amount) {
    text += `*Price:* ₹${(room.price_summary?.grand_total ?? room.grand_total ?? room.price)?.toLocaleString()} / night\n\n`;
  }
  
  if (options.location) {
    const city = options.location_city ? (room.property_location?.city || 'N/A') : '';
    const state = options.location_state ? (room.property_location?.state || 'N/A') : '';
    if (city || state) {
      text += `*Location:* ${[city, state].filter(Boolean).join(', ')}\n\n`;
    }
  }
  
  if (options.contactDetails) {
    if (options.contactDetails_phone) text += `*Phone:* ${room.owner_phone || 'N/A'}\n\n`;
  }

  return text.trim();
}
