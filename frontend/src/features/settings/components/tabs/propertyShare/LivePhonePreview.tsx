import React from 'react';
import { PropertyShareConfig } from '../../../types/shareSettings';

interface LivePhonePreviewProps {
  config: PropertyShareConfig;
}

export function LivePhonePreview({ config }: LivePhonePreviewProps) {
  const activeButtons: string[] = [];
  if (config.book_button_enabled) activeButtons.push(config.book_button_label || 'Book Now');
  if (config.details_button_enabled) activeButtons.push(config.details_button_label || 'More Details');
  if (config.next_button_enabled) activeButtons.push(config.next_button_label || 'Next');
  if (config.exit_button_enabled && activeButtons.length < 3) activeButtons.push(config.exit_button_label || 'Exit');

  const visibleButtons = activeButtons.slice(0, 3);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
      <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Message Preview
        </h4>
      </div>

      {/* Message Bubble Only (No phone frame or simulated chat screen) */}
      <div className="flex justify-center p-1">
        <div className="w-full max-w-[300px] bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-2xl shadow-sm border border-emerald-200/60 dark:border-emerald-700/40 overflow-hidden text-[12px]">
          {/* Header Image */}
          <div className="w-full h-36 bg-slate-800 overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=500&q=80"
              alt="Room Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
              Deluxe Ocean
            </div>
          </div>

          {/* Body Content */}
          <div className="p-3 space-y-1.5">
            <p className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight">
              🏨 Deluxe Ocean Suite
            </p>
            <p className="text-[11.5px] font-semibold text-[#007e3a] dark:text-[#a7f3d0]">
              📍 Beach Road • ₹3,499 / night
            </p>
            <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
              Max 3 Guests • AC, Free WiFi, Breakfast Included.
            </p>
            <div className="text-[10px] text-right text-slate-500 dark:text-emerald-200/70 pt-0.5">
              10:30 AM ✓✓
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="border-t border-emerald-200/70 dark:border-emerald-600/50 divide-y divide-emerald-200/70 dark:divide-emerald-600/50 bg-[#d9fdd3] dark:bg-[#005c4b]">
            {visibleButtons.length === 0 ? (
              <div className="py-2.5 text-center text-[11px] text-slate-400 italic">
                No buttons enabled
              </div>
            ) : (
              visibleButtons.map((lbl, idx) => (
                <div
                  key={idx}
                  className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#007e3a] dark:text-[#25d366] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer truncate"
                >
                  {lbl}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export with cleaner alias
export { LivePhonePreview as MessageBubblePreview };
