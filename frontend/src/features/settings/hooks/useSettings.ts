import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SettingsTab } from '../types';

export function useSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as SettingsTab;
  const [activeTab, setActiveTabState] = useState<SettingsTab>(tabFromUrl || 'whatsapp');

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams]);

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  return {
    activeTab,
    setActiveTab,
  };
}
