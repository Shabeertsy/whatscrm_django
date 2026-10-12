import React, { useState } from 'react';
import { Film, ChevronRight, CheckCheck } from 'lucide-react';
import { PropertyShareConfig, DEFAULT_PROPERTY_SHARE_CONFIG } from '../../../types/shareSettings';

interface DetailsMediaCardProps {
  config: PropertyShareConfig;
  onChange: (fields: Partial<PropertyShareConfig>) => void;
}

interface ShareCategory {
  key: string;
  label: string;
  subItems: { subKey: string; label: string; sample: string }[];
}

const SHARE_CATEGORIES: ShareCategory[] = [
  {
    key: 'basicDetails',
    label: 'Basic Room Details',
    subItems: [
      { subKey: 'basicDetails_roomName', label: 'Room Name', sample: 'Deluxe Ocean Suite' },
      { subKey: 'basicDetails_roomType', label: 'Room Type', sample: 'Suite' },
      { subKey: 'basicDetails_occupancy', label: 'Max Occupancy', sample: '3 Guests' },
      { subKey: 'basicDetails_amenities', label: 'Amenities', sample: 'Wi-Fi, AC, Sea View, Mini Bar' },
    ],
  },
  {
    key: 'searchFilters',
    label: 'Search Requirements (Dates & Guests)',
    subItems: [
      { subKey: 'filters_dates', label: 'Dates (Check-in / Check-out)', sample: '20 Oct 2026 – 23 Oct 2026' },
      { subKey: 'filters_guests', label: 'Guests', sample: '2 Adults, 1 Child' },
      { subKey: 'filters_rooms', label: 'Rooms Needed', sample: '1 Room' },
    ],
  },
  {
    key: 'propertyDetails',
    label: 'Property Details',
    subItems: [
      { subKey: 'propertyDetails_name', label: 'Property / Hotel Name', sample: 'Seaside Grand Resort' },
      { subKey: 'propertyDetails_type', label: 'Property Type', sample: '5-Star Resort' },
    ],
  },
  {
    key: 'price',
    label: 'Price & Meal Plans',
    subItems: [
      { subKey: 'price_amount', label: 'Price Amount (Nights & Rooms)', sample: '₹14,500 (3 nights, 1 room)' },
      { subKey: 'price_meal_plans', label: 'Meal Plans Available', sample: 'Breakfast Included: ₹1,500 extra' },
    ],
  },
  {
    key: 'location',
    label: 'Location',
    subItems: [
      { subKey: 'location_name', label: 'Area / Location Name', sample: 'Calangute Beachfront' },
      { subKey: 'location_city', label: 'City', sample: 'North Goa' },
      { subKey: 'location_state', label: 'State', sample: 'Goa' },
    ],
  },
  {
    key: 'contactDetails',
    label: 'Contact Details',
    subItems: [
      { subKey: 'contactDetails_phone', label: 'Contact Phone Number', sample: '+91 98765 43210' },
    ],
  },
];

function buildPreviewMessage(options: Record<string, boolean>): string {
  const blocks: string[] = [];

  // Basic Room Details
  if (options.basicDetails) {
    const lines: string[] = [];
    if (options.basicDetails_roomName) lines.push('*Deluxe Ocean Suite*');
    if (options.basicDetails_roomType) lines.push('*Room Type:* Suite');
    if (options.basicDetails_occupancy) lines.push('*Max Occupancy:* 3 Guests');
    if (options.basicDetails_amenities) lines.push('*Amenities:* Wi-Fi, AC, Sea View, Mini Bar');
    if (lines.length > 0) blocks.push(lines.join('\n'));
  }

  // Search Requirements
  if (options.searchFilters) {
    const lines: string[] = [];
    if (options.filters_dates) lines.push('Dates: 20 Oct 2026 to 23 Oct 2026');
    if (options.filters_guests) lines.push('Guests: 2 Adults, 1 Child');
    if (options.filters_rooms) lines.push('Rooms Needed: 1');
    if (lines.length > 0) blocks.push('*Requirements:*\n' + lines.join('\n'));
  }

  // Property Details
  if (options.propertyDetails) {
    const lines: string[] = [];
    if (options.propertyDetails_name) lines.push('*Property Name:* Seaside Grand Resort');
    if (options.propertyDetails_type) lines.push('*Property Type:* 5-Star Resort');
    if (lines.length > 0) blocks.push(lines.join('\n'));
  }

  // Price
  if (options.price) {
    const lines: string[] = [];
    if (options.price_amount) lines.push('*Price:* ₹14,500 (for 3 nights, 1 room)');
    if (options.price_meal_plans) {
      lines.push('*Meal Plans Available:*\n  • CP - Breakfast Included: ₹1,500 extra');
    }
    if (lines.length > 0) blocks.push(lines.join('\n'));
  }

  // Location
  if (options.location) {
    const locParts: string[] = [];
    if (options.location_name) locParts.push('Calangute Beachfront');
    if (options.location_city) locParts.push('North Goa');
    if (options.location_state) locParts.push('Goa');
    if (locParts.length > 0) blocks.push(`*Location:* ${locParts.join(', ')}`);
  }

  // Contact Details
  if (options.contactDetails) {
    if (options.contactDetails_phone) blocks.push('*Phone:* +91 98765 43210');
  }

  return blocks.join('\n\n');
}

export function DetailsMediaCard({ config, onChange }: DetailsMediaCardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('basicDetails');

  const selectedFields = config.details_selected_fields || DEFAULT_PROPERTY_SHARE_CONFIG.details_selected_fields;

  const handleParentToggle = (cat: ShareCategory, isChecked: boolean) => {
    const nextFields: Record<string, boolean> = {
      ...selectedFields,
      [cat.key]: isChecked,
    };
    cat.subItems.forEach((sub) => {
      nextFields[sub.subKey] = isChecked;
    });
    onChange({ details_selected_fields: nextFields });
  };

  const handleSubItemToggle = (cat: ShareCategory, subKey: string, isChecked: boolean) => {
    const nextFields: Record<string, boolean> = {
      ...selectedFields,
      [subKey]: isChecked,
    };
    const anyChecked = cat.subItems.some((s) => (s.subKey === subKey ? isChecked : !!selectedFields[s.subKey]));
    nextFields[cat.key] = anyChecked;
    onChange({ details_selected_fields: nextFields });
  };

  const previewText = buildPreviewMessage(selectedFields);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-5">
      <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          "More Details" Media & Content Configuration
        </h4>
      </div>

      {/* Media Attachments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Property Images */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.details_send_property_images}
                onChange={(e) => onChange({ details_send_property_images: e.target.checked })}
                className="rounded accent-[#007e3a] cursor-pointer"
              />
              Hotel / Property Photos
            </label>
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.details_property_image_limit} Photo{config.details_property_image_limit !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 30</span>
            </div>
            <input
              type="range" min={1} max={30}
              disabled={!config.details_send_property_images}
              value={config.details_property_image_limit}
              onChange={(e) => onChange({ details_property_image_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] disabled:opacity-40"
            />
          </div>
        </div>

        {/* Room Images */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={config.details_send_room_images}
                onChange={(e) => onChange({ details_send_room_images: e.target.checked })}
                className="rounded accent-[#007e3a] cursor-pointer"
              />
              Room Photos Album
            </label>
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.details_room_image_limit} Photo{config.details_room_image_limit !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 30</span>
            </div>
            <input
              type="range" min={1} max={30}
              disabled={!config.details_send_room_images}
              value={config.details_room_image_limit}
              onChange={(e) => onChange({ details_room_image_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* Video toggle & Count */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.details_send_videos}
              onChange={(e) => onChange({ details_send_videos: e.target.checked })}
              className="rounded accent-[#007e3a] cursor-pointer"
            />
            <Film className="h-4 w-4 text-[#007e3a]" />
            Send Property Video Walkthrough
          </label>
          {config.details_send_videos && (
            <span className="text-[11px] font-semibold text-[#007e3a]">
              {config.details_video_limit || 1} Video{(config.details_video_limit || 1) !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {config.details_send_videos && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 1</span><span>Max: 20</span>
            </div>
            <input
              type="range" min={1} max={20}
              value={config.details_video_limit || 1}
              onChange={(e) => onChange({ details_video_limit: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007e3a] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* ── Checkbox Selection & Message Bubble Preview ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Checkboxes (Matching ShareRoomModal) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Include in "More Details" Message
            </span>
            <span className="text-[11px] text-slate-400">
              Select fields to dispatch
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {SHARE_CATEGORIES.map((cat) => {
              const isParentChecked = !!selectedFields[cat.key];
              const isExpanded = expandedCategory === cat.key;

              return (
                <div
                  key={cat.key}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/40">
                    <label className="flex items-center gap-2.5 cursor-pointer group flex-1">
                      <input
                        type="checkbox"
                        checked={isParentChecked}
                        onChange={(e) => handleParentToggle(cat, e.target.checked)}
                        className="h-4 w-4 rounded accent-[#007e3a] cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#007e3a] transition-colors">
                        {cat.label}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''
                          }`}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                      {cat.subItems.map((sub) => (
                        <label
                          key={sub.subKey}
                          className="flex items-start gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedFields[sub.subKey]}
                            onChange={(e) => handleSubItemToggle(cat, sub.subKey, e.target.checked)}
                            className="h-3.5 w-3.5 rounded accent-[#007e3a] cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 leading-snug">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                              {sub.label}
                            </span>
                            <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              e.g. {sub.sample}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Message Bubble Preview (No phone UI, just pure message bubble) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Live WhatsApp Preview
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Outgoing Bubble
            </span>
          </div>

          <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 min-h-[300px] flex flex-col justify-end">
            <div className="space-y-1.5 max-w-sm self-end w-full">
              {/* WhatsApp message bubble */}
              <div className="relative bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-2xl rounded-tr-sm p-3.5 shadow-sm text-xs leading-relaxed">
                {previewText ? (
                  <div className="whitespace-pre-wrap font-sans">
                    {previewText}
                    <div className="mt-2.5 pt-2 border-t border-slate-300/40 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300">
                      Tap <strong>Book Now</strong> below to reserve this room.
                    </div>
                  </div>
                ) : (
                  <p className="italic text-slate-400 text-center py-4">
                    No fields selected. Select checkboxes on the left to include details in the message.
                  </p>
                )}

                <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-500 dark:text-emerald-200/80">
                  <span>10:45 AM</span>
                  <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                </div>
              </div>

              {/* Interactive buttons under message bubble */}
              <div className="space-y-1 pt-1">
                {config.book_button_enabled && (
                  <div className="w-full py-2 bg-white dark:bg-[#1f2c34] text-[#00a884] font-medium text-xs rounded-xl shadow-sm border border-slate-200/70 dark:border-slate-700/60 text-center select-none">
                    {config.book_button_label || 'Book Now'}
                  </div>
                )}
                {config.next_button_enabled && (
                  <div className="w-full py-2 bg-white dark:bg-[#1f2c34] text-[#00a884] font-medium text-xs rounded-xl shadow-sm border border-slate-200/70 dark:border-slate-700/60 text-center select-none">
                    {config.next_button_label || 'Next'}
                  </div>
                )}
                {config.exit_button_enabled && (
                  <div className="w-full py-2 bg-white dark:bg-[#1f2c34] text-slate-600 dark:text-slate-300 font-medium text-xs rounded-xl shadow-sm border border-slate-200/70 dark:border-slate-700/60 text-center select-none">
                    {config.exit_button_label || 'Exit'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
