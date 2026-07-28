import { useState } from 'react';
import type { SettingsTab, TabMeta } from '../types';

export function useSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('whatsapp');

  return {
    activeTab,
    setActiveTab,
  };
}
