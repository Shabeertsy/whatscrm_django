import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RoomFilters {
  search: string;
  checkIn: string;
  checkOut: string;
  propertyTypes: string[];
  roomTypes: string[];
  amenities: string[];
  roomViews: string[];
  bedroomTypes: string[];
  tags: string[];
  priceMin: number;
  priceMax: number;
  hideUnavailable: boolean;
  adults: number;
  children: number;
  rooms: number;
  mealPlans: string[];
  areas: string[];
  sort: string;
}

export const getDefaultFilters = (): RoomFilters => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  return {
    search: '',
    checkIn: today,
    checkOut: tomorrow,
    propertyTypes: [],
    roomTypes: [],
    amenities: [],
    roomViews: [],
    bedroomTypes: [],
    tags: [],
    priceMin: 0,
    priceMax: 50000,
    hideUnavailable: false,
    adults: 1,
    children: 0,
    rooms: 1,
    mealPlans: [],
    areas: [],
    sort: 'price_asc',
  };
};

interface HotelStore {
  selectedHotel: any | null;
  setSelectedHotel: (hotel: any) => void;
  filters: RoomFilters;
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  setFilters: (filters: RoomFilters | ((prev: RoomFilters) => RoomFilters)) => void;
  updateFilter: (key: keyof RoomFilters, value: any) => void;
  toggleArrayFilter: (
    key:
      | 'propertyTypes'
      | 'roomTypes'
      | 'amenities'
      | 'roomViews'
      | 'bedroomTypes'
      | 'tags'
      | 'mealPlans'
      | 'areas',
    value: string
  ) => void;
  clearFilters: () => void;
  resetAllFilters: () => void;
}

export const useHotelStore = create<HotelStore>()(
  persist(
    (set) => ({
      selectedHotel: null,
      setSelectedHotel: (hotel) => set({ selectedHotel: hotel }),
      filters: getDefaultFilters(),
      page: 1,
      setPage: (pageOrFn) =>
        set((state) => ({
          page: typeof pageOrFn === 'function' ? pageOrFn(state.page) : pageOrFn,
        })),
      setFilters: (filtersOrFn) =>
        set((state) => ({
          filters: typeof filtersOrFn === 'function' ? filtersOrFn(state.filters) : filtersOrFn,
        })),
      updateFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      toggleArrayFilter: (key, value) =>
        set((state) => {
          const arr = (state.filters[key] as string[]) || [];
          const newArr = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
          return {
            filters: { ...state.filters, [key]: newArr },
          };
        }),
      clearFilters: () =>
        set((state) => ({
          filters: {
            ...state.filters,
            propertyTypes: [],
            roomTypes: [],
            amenities: [],
            roomViews: [],
            bedroomTypes: [],
            tags: [],
            mealPlans: [],
            areas: [],
            priceMin: 0,
            priceMax: 50000,
            hideUnavailable: false,
            sort: 'price_asc',
          },
          page: 1,
        })),
      resetAllFilters: () =>
        set({
          filters: getDefaultFilters(),
          page: 1,
        }),
    }),
    {
      name: 'whatsaas_hotel_search_state',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        filters: state.filters,
        page: state.page,
      }),
    }
  )
);

