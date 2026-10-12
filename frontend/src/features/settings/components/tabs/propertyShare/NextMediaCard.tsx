import React from 'react';
import { Image } from 'lucide-react';
import { PropertyShareConfig } from '../../../types/shareSettings';

interface NextMediaCardProps {
  config: PropertyShareConfig;
  onChange: (fields: Partial<PropertyShareConfig>) => void;
}

export function NextMediaCard({ config, onChange }: NextMediaCardProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
      <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          "Next" Button Settings
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hero photo toggle */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.next_include_hero_image}
              onChange={(e) => onChange({ next_include_hero_image: e.target.checked })}
              className="rounded accent-[#007e3a] cursor-pointer"
            />
            Attach Hero Photo on Next Card
          </label>
          <p className="text-[11px] text-slate-400 pl-6">
            Includes the room or property's main cover image at the top of each next card.
          </p>
        </div>

        {/* Extra photos album */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.next_send_extra_album}
                onChange={(e) => onChange({ next_send_extra_album: e.target.checked })}
                className="rounded accent-[#007e3a] cursor-pointer"
              />
              <Image className="h-3.5 w-3.5 text-slate-500" />
              Send Extra Photos Album
            </label>
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.next_album_limit || 2} Photo{(config.next_album_limit || 2) !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pl-6">
            Sends property photos first and room photos second before the card.
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 20</span>
            </div>
            <input
              type="range" min={1} max={20}
              disabled={!config.next_send_extra_album}
              value={config.next_album_limit || 2}
              onChange={(e) => onChange({ next_album_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] disabled:opacity-40 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Fallback Text Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            End of Filtered Results Message
          </label>
          <input
            type="text"
            value={config.no_more_results_text}
            onChange={(e) => onChange({ no_more_results_text: e.target.value })}
            className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Exit Message
          </label>
          <input
            type="text"
            value={config.exit_message_text}
            onChange={(e) => onChange({ exit_message_text: e.target.value })}
            className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>
    </div>
  );
}
