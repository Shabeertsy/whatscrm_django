import React from 'react';

export type SettingsTab = 'whatsapp' | 'proxy_urls' | 'ai_providers' | 'departments' | 'users' | 'permissions';

export interface TabMeta {
  id: SettingsTab;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}
