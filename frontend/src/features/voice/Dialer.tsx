import React, { useState } from "react";
import { Phone, PhoneOff } from "lucide-react";

interface DialerProps {
  onCall: (phone: string) => void;
}

export function Dialer({ onCall }: DialerProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeCall, setActiveCall] = useState(false);

  const handleKeyPress = (num: string) => {
    setPhoneNumber((prev) => prev + num);
  };

  const handleClear = () => {
    setPhoneNumber("");
  };

  const handleToggleCall = () => {
    if (!phoneNumber) return;
    if (activeCall) {
      setActiveCall(false);
    } else {
      setActiveCall(true);
      onCall(phoneNumber);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl p-5 shadow-sm space-y-4 max-w-sm mx-auto transition duration-200">
      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Browser dialer</h3>

      {/* Screen */}
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-right">
        <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-semibold mb-1">
          {activeCall ? "Calling..." : "Enter Phone Number"}
        </span>
        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-lg tracking-wider">
          {phoneNumber || "—"}
        </span>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className="py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 active:bg-slate-100 dark:active:bg-slate-700 rounded-lg text-slate-808 text-slate-800 dark:text-slate-200 font-extrabold text-sm transition duration-150"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex space-x-2 pt-2 text-xs">
        <button
          onClick={handleClear}
          className="flex-1 py-2.5 border border-slate-205 border-slate-200 dark:border-slate-700 hover:bg-slate-55 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg font-bold transition"
        >
          Clear
        </button>
        <button
          onClick={handleToggleCall}
          className={`flex-1 py-2.5 text-white font-bold rounded-lg transition flex items-center justify-center space-x-2 ${
            activeCall ? "bg-rose-600 hover:bg-rose-500" : "bg-[#007e3a] hover:bg-[#00662f]"
          }`}
        >
          {activeCall ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          <span>{activeCall ? "Hang up" : "Call"}</span>
        </button>
      </div>
    </div>
  );
}

export default Dialer;
