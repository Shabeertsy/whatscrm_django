import React, { useState } from "react";
import { X } from "lucide-react";

interface AddStageModalProps {
  onClose: () => void;
  onSubmit: (title: string, color: string, isConfirmed: boolean) => void;
}

export function AddStageModal({ onClose, onSubmit }: AddStageModalProps) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#e2e8f0");
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim(), color, isConfirmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Add New Stage</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define stage title, color, and booking status</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-4">

            {/* Stage Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Stage Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] focus:ring-2 focus:ring-[#007e3a]/15"
                placeholder="e.g. Booking Confirmed"
                autoFocus
              />
            </div>

            {/* Stage Color */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Stage Color
              </label>
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer border-0 p-0"
                  />
                </div>
                <span className="text-xs text-slate-500 font-mono font-medium">{color}</span>
              </div>
            </div>

            {/* Confirmed Booking Stage Toggle */}
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isConfirmed
                ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-700'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Confirmed Booking Stage</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deals moved here are recorded as confirmed bookings
                </p>
              </div>
              <button
                type="button"
                role="switch"
                onClick={() => setIsConfirmed(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isConfirmed ? 'bg-[#007e3a]' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                aria-checked={isConfirmed}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isConfirmed ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              Create Stage
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default AddStageModal;
