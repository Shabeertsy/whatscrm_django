import { useState } from 'react';

export interface RoomFilters {
    search: string;
    checkIn: string;
    checkOut: string;
    propertyTypes: string[];
    roomTypes: string[];
    amenities: string[];
    priceMin: number;
    priceMax: number;
    hideUnavailable: boolean;
    adults: number;
    children: number;
    rooms: number;
}

export function useRoomFilters() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [filters, setFilters] = useState<RoomFilters>({
        search: "",
        checkIn: today,
        checkOut: tomorrow,
        propertyTypes: [],
        roomTypes: [],
        amenities: [],
        priceMin: 0,
        priceMax: 15000,
        hideUnavailable: false,
        adults: 1,
        children: 0,
        rooms: 1,
    });

    const updateFilter = (key: keyof RoomFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleArrayFilter = (key: 'propertyTypes' | 'roomTypes' | 'amenities', value: string) => {
        setFilters(prev => {
            const arr = prev[key] as string[];
            const newArr = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
            return { ...prev, [key]: newArr };
        });
    };

    const clearFilters = () => {
        setFilters(prev => ({
            ...prev,
            propertyTypes: [],
            roomTypes: [],
            amenities: [],
            priceMin: 0,
            priceMax: 15000,
            hideUnavailable: false,
        }));
    };

    return { filters, setFilters, updateFilter, toggleArrayFilter, clearFilters };
}
