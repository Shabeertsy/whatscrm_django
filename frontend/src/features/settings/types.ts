import React from 'react';

export type SettingsTab = 'whatsapp' | 'proxy_urls' | 'ai_providers' | 'locations' | 'departments' | 'users' | 'permissions';

export interface TabMeta {
  id: SettingsTab;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}
