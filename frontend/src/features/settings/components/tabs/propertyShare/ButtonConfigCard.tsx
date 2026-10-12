import React from 'react';
import { PropertyShareConfig } from '../../../types/shareSettings';

interface ButtonConfigCardProps {
  config: PropertyShareConfig;
  onChange: (fields: Partial<PropertyShareConfig>) => void;
}

export function ButtonConfigCard({ config, onChange }: ButtonConfigCardProps) {
  const activeCount = [
    config.book_button_enabled,
    config.details_button_enabled,
    config.next_button_enabled,
    config.exit_button_enabled,
  ].filter(Boolean).length;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          WhatsApp Action Buttons
        </h4>

        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            activeCount <= 3
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
          }`}
        >
          {activeCount > 3 ? 'Max 3 buttons allowed' : `${activeCount}/3 Active`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Book */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.book_button_enabled}
                onChange={(e) => onChange({ book_button_enabled: e.target.checked })}
                className="rounded accent-amber-500 text-amber-500"
              />
              Book Button
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {config.book_button_label.length}/20
            </span>
          </div>
          <input
            type="text"
            maxLength={20}
            disabled={!config.book_button_enabled}
            value={config.book_button_label}
            onChange={(e) => onChange({ book_button_label: e.target.value })}
            placeholder="Book Now"
            className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 disabled:opacity-40"
          />
          <div className="pt-1">
            <select
              disabled={!config.book_button_enabled}
              value={config.book_action_type}
              onChange={(e) => onChange({ book_action_type: e.target.value as any })}
              className="w-full text-xs px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
            >
              <option value="agent">Action: Notify Live Agent in Chat</option>
              <option value="flow">Action: Launch WhatsApp Flow Form</option>
              <option value="link">Action: Send Direct Checkout Link</option>
            </select>
          </div>
        </div>

        {/* More Details */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.details_button_enabled}
                onChange={(e) => onChange({ details_button_enabled: e.target.checked })}
                className="rounded accent-amber-500 text-amber-500"
              />
              More Details Button
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {config.details_button_label.length}/20
            </span>
          </div>
          <input
            type="text"
            maxLength={20}
            disabled={!config.details_button_enabled}
            value={config.details_button_label}
            onChange={(e) => onChange({ details_button_label: e.target.value })}
            placeholder="More Details"
            className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 disabled:opacity-40"
          />
        </div>

        {/* Next */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.next_button_enabled}
                onChange={(e) => onChange({ next_button_enabled: e.target.checked })}
                className="rounded accent-amber-500 text-amber-500"
              />
              Next Button
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {config.next_button_label.length}/20
            </span>
          </div>
          <input
            type="text"
            maxLength={20}
            disabled={!config.next_button_enabled}
            value={config.next_button_label}
            onChange={(e) => onChange({ next_button_label: e.target.value })}
            placeholder="Next"
            className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 disabled:opacity-40"
          />
        </div>

        {/* Exit */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.exit_button_enabled}
                onChange={(e) => onChange({ exit_button_enabled: e.target.checked })}
                className="rounded accent-amber-500 text-amber-500"
              />
              Exit Button
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {config.exit_button_label.length}/20
            </span>
          </div>
          <input
            type="text"
            maxLength={20}
            disabled={!config.exit_button_enabled}
            value={config.exit_button_label}
            onChange={(e) => onChange({ exit_button_label: e.target.value })}
            placeholder="Exit"
            className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 disabled:opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
