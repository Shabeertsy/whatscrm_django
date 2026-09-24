import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, X, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
import type { Location, LocationPayload } from '../../../../api/accounts';
import { FormField } from '../ui/FormField';
import { apiClient } from '../../../../api/client';

interface AreaOption {
  uuid: string;
  name: string;
  slug: string;
  district: { id: number; name: string; slug: string; state: string };
}

interface District {
  id: number;
  name: string;
  slug: string;
  state: string;
}

export function LocationModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Location | null;
  onClose: () => void;
  onSave: (payload: LocationPayload) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<LocationPayload>(
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          is_active: initial.is_active,
          area_uuid: initial.area_uuid ?? '',
          district_slug: initial.district_slug ?? '',
        }
      : { name: '', description: '', is_active: true, area_uuid: '', district_slug: '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Selected district slug (separate from form state — drives the area list)
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState(
    initial?.district_slug ?? ''
  );

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await apiClient.get('/core/room-config/');
        setAreas(res.data?.areas || []);
      } catch {
        // Non-critical
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchAreas();
  }, []);

  // Build unique district list from areas
  const districts: District[] = useMemo(() => {
    const seen = new Set<string>();
    const list: District[] = [];
    areas.forEach((a) => {
      if (a.district && !seen.has(a.district.slug)) {
        seen.add(a.district.slug);
        list.push(a.district);
      }
    });
    return list;
  }, [areas]);

  // Areas belonging to the selected district
  const filteredAreas = useMemo(
    () => areas.filter((a) => a.district?.slug === selectedDistrictSlug),
    [areas, selectedDistrictSlug]
  );

  const handleDistrictChange = (slug: string) => {
    setSelectedDistrictSlug(slug);
    // Selecting a district activates ALL its areas — clear specific area_uuid,
    // store only the district_slug
    setForm((f) => ({ ...f, district_slug: slug, area_uuid: '' }));
  };

  const handleAreaChange = (uuid: string) => {
    const selected = areas.find((a) => a.uuid === uuid);
    setForm((f) => ({
      ...f,
      area_uuid: uuid,
      district_slug: selected?.district?.slug ?? '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        area_uuid: form.area_uuid || '',
        district_slug: form.district_slug || '',
      });
      onClose();
    } catch {
      setError('Failed to save location. Location name must be unique.');
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
              <MapPin className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit Location' : 'New Location'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage locations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField
            label="Location Name"
            name="name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
          />

          {/* District → Area two-level picker */}
          {loadingAreas ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading districts…
            </div>
          ) : districts.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No areas available</p>
          ) : (
            <div className="space-y-3">
              {/* District selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  District
                </label>
                <select
                  value={selectedDistrictSlug}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">-- Select District --</option>
                  {districts.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}, {d.state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Area</span>
                  {!selectedDistrictSlug && (
                    <span className="text-slate-400 font-normal">Select a district first</span>
                  )}
                </label>
                <select
                  value={form.area_uuid ?? ''}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className={`${selectClass} ${!selectedDistrictSlug ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!selectedDistrictSlug}
                >
                  <option value="">
                    {!selectedDistrictSlug 
                      ? '-- Select a District First --' 
                      : '-- All areas (district-wide) --'}
                  </option>
                  {filteredAreas.map((area) => (
                    <option key={area.uuid} value={area.uuid}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <FormField
            label="Description (Optional)"
            name="description"
            value={form.description ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            isTextArea
          />

          {error && (
            <div className="flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#007e3a] hover:bg-[#00602d] rounded-xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
