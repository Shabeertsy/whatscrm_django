import { create } from 'zustand';

interface HotelStore {
  selectedHotel: any | null;
  setSelectedHotel: (hotel: any) => void;
}

export const useHotelStore = create<HotelStore>((set) => ({
  selectedHotel: null,
  setSelectedHotel: (hotel) => set({ selectedHotel: hotel }),
}));
