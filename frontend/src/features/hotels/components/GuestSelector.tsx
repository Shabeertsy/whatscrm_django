import React, { useRef, useEffect } from 'react';



interface GuestSelectorProps {
  adults: number;
  children: number;
  roomsCount: number;
  setAdults: (val: number | ((v: number) => number)) => void;
  setChildren: (val: number | ((v: number) => number)) => void;
  setRoomsCount: (val: number | ((v: number) => number)) => void;
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
}



export function GuestSelector({ adults, children, roomsCount, setAdults, setChildren, setRoomsCount, showDropdown, setShowDropdown }: GuestSelectorProps) {
  const guestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowDropdown]);

  return (
    <div className="px-5 py-3.5 min-w-[160px] relative cursor-pointer" ref={guestRef} onClick={() => setShowDropdown(v => !v)}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 cursor-pointer">Guests</label>
      <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {adults + children} Persons
      </div>
      <div className="text-[10px] text-slate-400">{adults} Adult · {children} Child · {roomsCount} Room</div>
      
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 w-[220px] z-50" onClick={e => e.stopPropagation()}>
          {[
            { label: 'Adults', val: adults, min: 1, set: setAdults },
            { label: 'Children', val: children, min: 0, set: setChildren },
            { label: 'Rooms', val: roomsCount, min: 1, set: setRoomsCount },
          ].map(({ label, val, min, set }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => set(v => Math.max(min, v - 1))} className="w-7 h-7 flex items-center justify-center border border-[#007e3a] text-[#007e3a] rounded-lg hover:bg-green-50 transition-colors text-base font-bold">−</button>
                <span className="w-5 text-center font-bold text-[13px] text-slate-900 dark:text-white">{val}</span>
                <button onClick={() => set(v => v + 1)} className="w-7 h-7 flex items-center justify-center bg-[#007e3a] text-white rounded-lg hover:bg-[#00602d] transition-colors text-base font-bold">+</button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowDropdown(false)} className="w-full mt-3 bg-[#007e3a] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#00602d] transition-colors">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
