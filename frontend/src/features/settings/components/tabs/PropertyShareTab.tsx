import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Loader2, CheckCircle2, Eye, X, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { messagingApi } from '../../../../api/messaging';
import {
  PropertyShareConfig,
  DEFAULT_PROPERTY_SHARE_CONFIG,
} from '../../types/shareSettings';

import { InitialMediaCard } from './propertyShare/InitialMediaCard';
import { ButtonConfigCard } from './propertyShare/ButtonConfigCard';
import { DetailsMediaCard } from './propertyShare/DetailsMediaCard';
import { NextMediaCard } from './propertyShare/NextMediaCard';
import { LivePhonePreview } from './propertyShare/LivePhonePreview';

export function PropertyShareTab() {
  const [config, setConfig] = useState<PropertyShareConfig>(DEFAULT_PROPERTY_SHARE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await messagingApi.getPropertyShareConfig();
      if (res.data) {
        setConfig({ ...DEFAULT_PROPERTY_SHARE_CONFIG, ...res.data });
      }
    } catch (err) {
      console.error('Failed to load property share settings', err);
      toast.error('Failed to load share settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (fields: Partial<PropertyShareConfig>) => {
    setConfig((prev: PropertyShareConfig) => ({ ...prev, ...fields }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await messagingApi.updatePropertyShareConfig(config);
      toast.success('Share settings saved successfully!');
    } catch (err) {
      console.error('Failed to save property share settings', err);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_PROPERTY_SHARE_CONFIG);
    toast('Reset to default values. Click Save to apply.', { icon: 'ℹ️' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading Share Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Property & Room Share Settings
          </h3>

        </div>

        <div className="flex items-center gap-2">
          {/* Preview Popup Icon Button */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Eye className="h-3.5 w-3.5 text-[#007e3a]" />
            Preview Message
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#007e3a] hover:bg-[#00602d] text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Settings
          </button>
        </div>
      </div>

      {/* Full Width Settings Cards */}
      <div className="space-y-6 w-full max-w-5xl">
        <InitialMediaCard config={config} onChange={handleChange} />
        <ButtonConfigCard config={config} onChange={handleChange} />
        <DetailsMediaCard config={config} onChange={handleChange} />
        <NextMediaCard config={config} onChange={handleChange} />
      </div>

      {/* Preview Modal Popup */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#007e3a]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Message Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <LivePhonePreview config={config} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyShareTab;
