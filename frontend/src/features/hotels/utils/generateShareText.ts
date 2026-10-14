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
    const pName = room.property_details?.property_name || room.owner_brand_name || room.owner_username;
    const pType = room.property_type?.name;
    const areaName =
      room.property_details?.area?.name ||
      (typeof room.property_details?.area === 'string' ? room.property_details?.area : '') ||
      room.area?.name ||
      (typeof room.area === 'string' ? room.area : '') ||
      room.property_location?.name ||
      '';

    let hasLines = false;
    if (options.propertyDetails_name && pName) {
      text += `*Property Name:* ${pName}\n`;
      hasLines = true;
    }
    if (options.propertyDetails_type && pType) {
      text += `*Property Type:* ${pType}\n`;
      hasLines = true;
    }
    if (options.propertyDetails_area && areaName) {
      text += `*Area:* ${areaName}\n`;
      hasLines = true;
    }
    if (hasLines) {
      text += '\n';
    }
  }

  if (options.price && options.price_amount) {
    const nights = room.price_summary?.nights || 1;
    const roomsCount = filters?.rooms || 1;
    text += `*Price:* ₹${(room.price_summary?.grand_total ?? room.grand_total ?? room.price)?.toLocaleString()} (for ${nights} night${nights > 1 ? 's' : ''}, ${roomsCount} room${roomsCount > 1 ? 's' : ''})\n`;

    if (room.rate_plans && room.rate_plans.length > 0) {
      const plans = room.rate_plans.map((rp: any) => `${rp.meal_plan?.name || rp.meal_plan?.code}: ₹${(rp.base_price || 0).toLocaleString()} extra`).join('\n  • ');
      text += `*Meal Plans Available:*\n  • ${plans}\n`;
    }
    text += `\n`;
  }

  if (options.location) {
    const locName = options.location_name ? (room.property_location?.name || room.property_details?.area?.name || '') : '';
    const city = options.location_city ? (room.property_location?.city || room.property_details?.district?.name || '') : '';
    const state = options.location_state ? (room.property_location?.state || room.property_details?.district?.state || '') : '';
    const locParts = [locName, city, state].filter(Boolean);
    if (locParts.length > 0) {
      text += `*Location:* ${locParts.join(', ')}\n\n`;
    }
  }

  if (options.contactDetails) {
    if (options.contactDetails_phone) text += `*Phone:* ${room.owner_phone || 'N/A'}\n\n`;
  }

  return text.trim();
}
