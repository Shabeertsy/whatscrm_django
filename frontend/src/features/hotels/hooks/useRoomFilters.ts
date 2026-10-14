import { useHotelStore, RoomFilters, getDefaultFilters } from '../../../store/hotelStore';

export type { RoomFilters };
export { getDefaultFilters };

export function useRoomFilters() {
    const filters = useHotelStore(state => state.filters);
    const setFilters = useHotelStore(state => state.setFilters);
    const updateFilter = useHotelStore(state => state.updateFilter);
    const toggleArrayFilter = useHotelStore(state => state.toggleArrayFilter);
    const clearFilters = useHotelStore(state => state.clearFilters);
    const page = useHotelStore(state => state.page);
    const setPage = useHotelStore(state => state.setPage);

    return { filters, setFilters, updateFilter, toggleArrayFilter, clearFilters, page, setPage };
}
