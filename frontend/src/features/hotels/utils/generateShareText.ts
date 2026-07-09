export function generateShareText(
  room: any, 
  options: Record<string, boolean>,
  filters?: any,
  amenityOptions?: any[],
  propertyTypeOptions?: any[]
) {
  if (!room) return '';
  let text = `*${room.name}*\n\n`;

  if (options.searchFilters !== false && filters) {
    const filterParts = [];
    if (options.filters_dates !== false && (filters.checkIn || filters.checkOut)) {
      filterParts.push(`Dates: ${filters.checkIn || 'Any'} to ${filters.checkOut || 'Any'}`);
    }
    if (options.filters_guests !== false && (filters.adults || filters.children)) {
      filterParts.push(`Guests: ${filters.adults || 1} Adults, ${filters.children || 0} Children`);
    }
    if (options.filters_rooms !== false && filters.rooms) {
      filterParts.push(`Rooms Needed: ${filters.rooms}`);
    }
    if (options.filters_propertyTypes !== false && room.property_type) {
      filterParts.push(`Property Type: ${room.property_type.name}`);
    }
    if (options.filters_amenities !== false && room.amenities?.length > 0) {
      const aNames = room.amenities.map((a: any) => a.name).join(', ');
      filterParts.push(`Amenities: ${aNames}`);
    }

    if (filterParts.length > 0) {
      text += `*Requirements:*\n${filterParts.join('\n')}\n\n`;
    }
  }

  if (options.propertyDetails !== false) {
    if (options.propertyDetails_type !== false) text += `*Type:* ${room.room_type?.name || 'N/A'}\n`;
    if (options.propertyDetails_occupancy !== false) text += `*Occupancy:* ${room.base_occupancy}-${room.max_occupancy} Guests\n`;
    text += '\n';
  }
  
  if (options.price !== false) {
    if (options.price_amount !== false) text += `*Price:* ₹${(room.price_summary?.grand_total ?? room.grand_total ?? room.price)?.toLocaleString()} / night\n\n`;
  }
  
  if (options.location !== false) {
    const city = options.location_city !== false ? (room.property_location?.city || 'N/A') : '';
    const state = options.location_state !== false ? (room.property_location?.state || 'N/A') : '';
    if (city || state) {
      text += `*Location:* ${[city, state].filter(Boolean).join(', ')}\n\n`;
    }
  }
  
  if (options.contactDetails !== false) {
    if (options.contactDetails_owner !== false) text += `*Contact Owner:* ${room.owner_username || room.owner_brand_name || 'N/A'}\n`;
    if (options.contactDetails_phone !== false) text += `*Phone:* ${room.owner_phone || 'N/A'}\n`;
    text += '\n';
  }

  // text += `*View More Details:* ${window.location.origin}/#/hotels/${room.uuid}\n`;

  if (options.images !== false && room.room_images?.length > 0) {
    const imagesToInclude = room.room_images.filter((_: any, i: number) => options[`images_${i}`] !== false);
    if (imagesToInclude.length > 0) {
      text += `\n*Images:*\n`;
      imagesToInclude.forEach((img: any, i: number) => {
        text += `${i+1}. ${img.url || img.image}\n`;
      });
    }
  }

  return text;
}
