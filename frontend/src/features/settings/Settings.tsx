import React from 'react';
import { MessageSquare, Globe, Bot, Building2, MapPin, Users, ShieldCheck } from 'lucide-react';
import type { SettingsTab, TabMeta } from './types';
import { useSettings } from './hooks/useSettings';
import { useAuthStore } from '../../store/authStore';
import { getUserPermissions } from '../../utils/permissions';
import { SettingsHeader } from './components/SettingsHeader';
import { SettingsSidebar } from './components/SettingsSidebar';
import { WhatsappInstancesTab } from './components/tabs/WhatsappInstancesTab';
import { ProxyURLsTab } from './components/tabs/ProxyURLsTab';
import { AiProvidersTab } from './components/tabs/AiProvidersTab';
import { LocationsTab } from './components/tabs/LocationsTab';
import { DepartmentsTab } from './components/tabs/DepartmentsTab';
import { UsersTab } from './components/tabs/UsersTab';
import { PermissionsTab } from './components/tabs/PermissionsTab';



export function Settings() {
  const { activeTab, setActiveTab } = useSettings();
  const [authState] = useAuthStore();
  const permissions = getUserPermissions(authState?.user);

  const allTabs: (TabMeta & { permitted?: boolean })[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp Instances',
      subtitle: 'Meta Cloud API numbers & access tokens',
      icon: <MessageSquare className="h-4 w-4 flex-shrink-0" />,
      permitted: !!(permissions.canAccessSettingsWhatsapp ?? permissions.canAccessSettings),
    },
    {
      id: 'proxy_urls',
      label: 'Proxy URLs',
      subtitle: 'Outbound request proxy gateways',
      icon: <Globe className="h-4 w-4 flex-shrink-0" />,
      permitted: !!(permissions.canAccessSettingsProxies ?? permissions.canAccessSettings),
    },
    {
      id: 'ai_providers',
      label: 'AI Providers',
      subtitle: 'OpenAI, Claude, and Gemini API keys',
      icon: <Bot className="h-4 w-4 flex-shrink-0" />,
      permitted: !!(permissions.canAccessSettingsAi ?? permissions.canAccessSettings),
    },
    {
      id: 'locations',
      label: 'Locations',
      subtitle: 'Manage company offices and physical locations',
      icon: <MapPin className="h-4 w-4 flex-shrink-0" />,
      permitted: !!permissions.canManageDepartments, // Using same permission for now
    },
    {
      id: 'departments',
      label: 'Departments',
      subtitle: 'Company team structure & roles',
      icon: <Building2 className="h-4 w-4 flex-shrink-0" />,
      permitted: !!permissions.canManageDepartments,
    },
    {
      id: 'users',
      label: 'Users & Roles',
      subtitle: 'Manage team agents & department assignments',
      icon: <Users className="h-4 w-4 flex-shrink-0" />,
      permitted: !!permissions.canManageUsers,
    },
    {
      id: 'permissions',
      label: 'Role Permissions',
      subtitle: 'Per-department module access control',
      icon: <ShieldCheck className="h-4 w-4 flex-shrink-0" />,
      permitted: !!(permissions.canManageRolePermissions ?? permissions.canAccessSettings),
    },
  ];

  const tabs = allTabs.filter((t) => t.permitted) as TabMeta[];

  React.useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab, setActiveTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <SettingsHeader />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <SettingsSidebar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Active View Panel */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-900/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm min-h-[500px]">
          {activeTab === 'whatsapp' && <WhatsappInstancesTab />}
          {activeTab === 'proxy_urls' && <ProxyURLsTab />}
          {activeTab === 'ai_providers' && <AiProvidersTab />}
          {activeTab === 'locations' && <LocationsTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
        </div>
      </div>
    </div>
  );
}

export default Settings;
