import React from 'react';
import { Film, Image, Layers } from 'lucide-react';
import { PropertyShareConfig } from '../../../types/shareSettings';

interface InitialMediaCardProps {
  config: PropertyShareConfig;
  onChange: (fields: Partial<PropertyShareConfig>) => void;
}

export function InitialMediaCard({ config, onChange }: InitialMediaCardProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
      <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#007e3a]" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            First-Time Share Media Settings
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hotel / Property Photos */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.initial_send_property_images}
                onChange={(e) => onChange({ initial_send_property_images: e.target.checked })}
                className="rounded accent-[#007e3a] cursor-pointer"
              />
              <Image className="h-3.5 w-3.5 text-slate-500" />
              Hotel / Property Photos
            </label>
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.initial_property_image_limit ?? 1} Photo{(config.initial_property_image_limit ?? 1) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 30</span>
            </div>
            <input
              type="range" min={1} max={30}
              disabled={!config.initial_send_property_images}
              value={config.initial_property_image_limit ?? 1}
              onChange={(e) => onChange({ initial_property_image_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] disabled:opacity-40 cursor-pointer"
            />
          </div>
        </div>

        {/* Room Images */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.initial_send_room_images}
                onChange={(e) => onChange({ initial_send_room_images: e.target.checked })}
                className="rounded accent-[#007e3a] cursor-pointer"
              />
              <Image className="h-3.5 w-3.5 text-slate-500" />
              Room Photos
            </label>
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.initial_room_image_limit ?? 1} Photo{(config.initial_room_image_limit ?? 1) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 30</span>
            </div>
            <input
              type="range" min={1} max={30}
              disabled={!config.initial_send_room_images}
              value={config.initial_room_image_limit ?? 1}
              onChange={(e) => onChange({ initial_room_image_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] disabled:opacity-40 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Property Video Walkthrough */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.initial_send_videos}
              onChange={(e) => onChange({ initial_send_videos: e.target.checked })}
              className="rounded accent-[#007e3a] cursor-pointer"
            />
            <Film className="h-4 w-4 text-[#007e3a]" />
            Property Video Walkthrough
          </label>
          {config.initial_send_videos && (
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.initial_video_limit || 1} Video{(config.initial_video_limit || 1) !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {config.initial_send_videos && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 20</span>
            </div>
            <input
              type="range" min={1} max={20}
              value={config.initial_video_limit || 1}
              onChange={(e) => onChange({ initial_video_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
