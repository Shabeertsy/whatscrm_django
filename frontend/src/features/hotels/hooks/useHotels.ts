import { useState, useEffect, useCallback } from 'react';
import { hotelsApi } from '../../../api/hotels';
import { RoomFilters } from './useRoomFilters';



export function useHotels(filters: RoomFilters, setPageCallback: (page: number) => void, page: number) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [resultCount, setResultCount] = useState(0);

  const [propertyTypeOptions, setPropertyTypeOptions] = useState<any[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<any[]>([]);
  const [amenityOptions, setAmenityOptions] = useState<any[]>([]);

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
      if (filters.priceMin > 0) params.min_price = filters.priceMin;
      if (filters.priceMax < 20000) params.max_price = filters.priceMax;

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
  }, [page, filters, setPageCallback]);
  useEffect(() => {
    fetchRooms();
  }, [page, filters.propertyTypes, filters.roomTypes, filters.amenities, filters.priceMin, filters.priceMax, filters.hideUnavailable]);

  useEffect(() => {
    const t = setTimeout(() => { if (filters.search !== '') fetchRooms(true); }, 500);
    return () => clearTimeout(t);
  }, [filters.search]);
  return {
    rooms, loading, error, totalPages, resultCount,
    propertyTypeOptions, roomTypeOptions, amenityOptions,
    fetchRooms
  };
}
