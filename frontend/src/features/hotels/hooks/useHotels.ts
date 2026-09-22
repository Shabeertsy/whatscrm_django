import { useState, useEffect, useCallback } from 'react';
import { hotelsApi } from '../../../api/hotels';
import { RoomFilters } from './useRoomFilters';
import { authStore } from '../../../store/authStore';


export function useHotels(filters: RoomFilters, setPageCallback: (page: number) => void, page: number) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [resultCount, setResultCount] = useState(0);

  const [propertyTypeOptions, setPropertyTypeOptions] = useState<any[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<any[]>([]);
  const [amenityOptions, setAmenityOptions] = useState<any[]>([]);
  const [roomViewOptions, setRoomViewOptions] = useState<any[]>([]);
  const [bedroomTypeOptions, setBedroomTypeOptions] = useState<any[]>([]);
  const [tagOptions, setTagOptions] = useState<any[]>([]);
  const [mealPlanOptions, setMealPlanOptions] = useState<any[]>([]);
  const [areaOptions, setAreaOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [roomRes, propRes] = await Promise.all([
          hotelsApi.getRoomConfig(),
          hotelsApi.getPropertyConfig()
        ]);
        if (roomRes.data) {
          setRoomTypeOptions(roomRes.data.room_types || []);
          setAmenityOptions(roomRes.data.amenities || []);
          setRoomViewOptions(roomRes.data.room_views || []);
          setBedroomTypeOptions(roomRes.data.bedroom_types || []);
          setTagOptions(roomRes.data.property_tags || roomRes.data.tags || []);
          setMealPlanOptions(roomRes.data.meal_plans || []);
          setAreaOptions(roomRes.data.areas || []);
        }
        if (propRes.data) {
          setPropertyTypeOptions(propRes.data.property_types || []);
          if (propRes.data.amenities && (!roomRes.data || !roomRes.data.amenities)) {
            setAmenityOptions(propRes.data.amenities);
          }
        }
      } catch (err) {
        console.error("Failed to load configs", err);
      }
    };
    fetchConfigs();
  }, []);

  const fetchRooms = useCallback(async (resetPage = false) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = {
        page: resetPage ? 1 : page,
        page_size: 10,
        adults: filters.adults,
        children: filters.children,
        rooms_needed: filters.rooms,
        hide_unavailable: filters.hideUnavailable,
      };
      if (filters.checkIn) params.check_in = filters.checkIn;
      if (filters.checkOut) params.check_out = filters.checkOut;
      if (filters.search) params.search = filters.search;
      if (filters.propertyTypes.length > 0) params.property_type = filters.propertyTypes.join(',');
      if (filters.roomTypes.length > 0) params.room_type = filters.roomTypes.join(',');
      if (filters.amenities.length > 0) params.amenities = filters.amenities.join(',');
      if (filters.roomViews.length > 0) params.room_views = filters.roomViews.join(',');
      if (filters.bedroomTypes.length > 0) params.bedroom_type = filters.bedroomTypes.join(',');
      if (filters.tags.length > 0) params.tags = filters.tags.join(',');
      if (filters.mealPlans.length > 0) params.meal_plans = filters.mealPlans.join(',');
      if (filters.areas.length > 0) params.areas = filters.areas.join(',');
      if (filters.priceMin > 0) params.min_price = filters.priceMin;
      if (filters.priceMax < 50000) params.max_price = filters.priceMax;

      const user = authStore.getState().user;
      const isSuperuser = user?.is_superuser || user?.role === 'Owner';
      if (!isSuperuser) {
        if (user?.location_area_uuid) {
          // Lock strictly to their assigned area
          params.areas = user.location_area_uuid;
        } else if (user?.location_district_slug) {
          // Find all area UUIDs in their assigned district
          const districtAreaUuids = areaOptions
            .filter((a) => a.district?.slug === user.location_district_slug)
            .map((a) => a.uuid);
          
          if (districtAreaUuids.length > 0) {
            if (filters.areas.length > 0) {
              // If they selected specific areas in the UI, only keep the ones that are in their district
              const allowedSelections = filters.areas.filter(uuid => districtAreaUuids.includes(uuid));
              // If they selected areas outside their district, it will filter down to nothing or the allowed ones
              params.areas = allowedSelections.length > 0 ? allowedSelections.join(',') : 'none'; // 'none' to force empty results
            } else {
              // Otherwise, show all areas in their district
              params.areas = districtAreaUuids.join(',');
            }
          } else {
            params.search = params.search ? `${params.search} ${user.location_name}` : user.location_name;
          }
        } else if (user?.location_name) {
          params.search = params.search ? `${params.search} ${user.location_name}` : user.location_name;
        }
      }

      const response = await hotelsApi.getCrmRooms(params);
      const data = response.data;
      setRooms(data.rooms || []);
      setTotalPages(data.total_pages || 1);
      setResultCount(data.result_count || 0);
      if (resetPage) setPageCallback(1);
    } catch (err: any) {
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filters, setPageCallback, areaOptions]);
  useEffect(() => {
    fetchRooms();
  }, [
    page, filters.propertyTypes, filters.roomTypes, filters.amenities,
    filters.roomViews, filters.bedroomTypes, filters.tags, filters.mealPlans,
    filters.areas,
    filters.priceMin, filters.priceMax, filters.hideUnavailable
  ]);

  useEffect(() => {
    const t = setTimeout(() => { if (filters.search !== '') fetchRooms(true); }, 500);
    return () => clearTimeout(t);
  }, [filters.search]);
  return {
    rooms, loading, error, totalPages, resultCount,
    propertyTypeOptions, roomTypeOptions, amenityOptions,
    roomViewOptions, bedroomTypeOptions, tagOptions, mealPlanOptions, areaOptions,
    fetchRooms
  };
}
