import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Building2,
  Loader2,
  Save,
  RotateCcw,
  Check,
  Minus,
  Lock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  accountsApi,
  Department,
  DepartmentRolePermission,
  PermissionKey,
  PermissionMap,
  UserType,
} from '../../../../api/accounts';
import toast from 'react-hot-toast';

// Module definitions
interface ModuleMeta {
  key: PermissionKey;
  label: string;
  description: string;
  category: string;
}

const ALL_MODULES: ModuleMeta[] = [
  { key: 'canAccessDashboard', label: 'Dashboard', description: 'Overview analytics and system metrics', category: 'Core' },
  { key: 'canAccessChats', label: 'Live Chats & Inbox', description: 'Read and reply to WhatsApp conversations', category: 'Core' },
  { key: 'canAccessPipeline', label: 'Pipeline & Deals', description: 'Manage sales pipeline stages and deal cards', category: 'Core' },
  { key: 'canAccessContacts', label: 'Contacts Directory', description: 'View, create and manage CRM contacts', category: 'Core' },
  { key: 'canAccessHotels', label: 'Hotels & Resorts', description: 'Access property management and booking module', category: 'Core' },
  { key: 'canAccessTemplates', label: 'Message Templates', description: 'Create and submit WhatsApp broadcast templates', category: 'Marketing' },
  { key: 'canAccessCustomMessages', label: 'Custom Messages', description: 'Build and schedule custom messaging flows', category: 'Marketing' },
  { key: 'canAccessMedia', label: 'Media Library', description: 'Upload and organize shared media assets', category: 'Marketing' },
  { key: 'canAccessAiAgent', label: 'AI Agent Config', description: 'Configure AI response personas and instructions', category: 'Advanced' },
  { key: 'canAccessAutomations', label: 'Workflows & Automations', description: 'Build automated event triggers and rules', category: 'Advanced' },
  { key: 'canAccessSettings', label: 'General Settings Access', description: 'Master switch for settings section entrance', category: 'Admin' },
  { key: 'canAccessSettingsWhatsapp', label: 'Settings: WhatsApp Instances', description: 'Manage Meta Cloud API numbers & tokens', category: 'Admin' },
  { key: 'canAccessSettingsProxies', label: 'Settings: Proxy URLs', description: 'Manage outbound request proxy gateways', category: 'Admin' },
  { key: 'canAccessSettingsAi', label: 'Settings: AI Providers', description: 'Manage OpenAI, Claude, and Gemini API keys', category: 'Admin' },
  { key: 'canManageDepartments', label: 'Settings: Departments', description: 'Create and configure organizational departments', category: 'Admin' },
  { key: 'canManageUsers', label: 'Settings: Users & Roles', description: 'Create, edit and deactivate user accounts', category: 'Admin' },
  { key: 'canManageRolePermissions', label: 'Settings: Role Permissions', description: 'Configure module access matrix for roles', category: 'Admin' },
];

const CATEGORIES = ['Core', 'Marketing', 'Advanced', 'Admin'] as const;

// Role definitions
interface RoleMeta {
  value: UserType;
  label: string;
  description: string;
  color: string;
  badgeBg: string;
  defaultPermissions: Partial<PermissionMap>;
}

const ROLES: RoleMeta[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full administrative access',
    color: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-100/80 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
    defaultPermissions: {
      canAccessDashboard: true, canAccessChats: true, canAccessPipeline: true,
      canAccessContacts: true, canAccessHotels: true, canAccessTemplates: true,
      canAccessCustomMessages: true, canAccessMedia: true, canAccessAiAgent: true,
      canAccessAutomations: true, canAccessSettings: true,
      canAccessSettingsWhatsapp: true, canAccessSettingsProxies: true,
      canAccessSettingsAi: true, canManageUsers: true,
      canManageDepartments: true, canManageRolePermissions: true,
    },
  },
  {
    value: 'agent',
    label: 'CRM Agent',
    description: 'Standard support & sales',
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    defaultPermissions: {
      canAccessDashboard: true, canAccessChats: true, canAccessPipeline: true,
      canAccessContacts: true, canAccessHotels: true, canAccessTemplates: false,
      canAccessCustomMessages: false, canAccessMedia: false, canAccessAiAgent: false,
      canAccessAutomations: false, canAccessSettings: false,
      canAccessSettingsWhatsapp: false, canAccessSettingsProxies: false,
      canAccessSettingsAi: false, canManageUsers: false,
      canManageDepartments: false, canManageRolePermissions: false,
    },
  },
  {
    value: 'staff',
    label: 'General Staff',
    description: 'Limited view-only access',
    color: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    defaultPermissions: {
      canAccessDashboard: true, canAccessChats: false, canAccessPipeline: false,
      canAccessContacts: true, canAccessHotels: true, canAccessTemplates: false,
      canAccessCustomMessages: false, canAccessMedia: false, canAccessAiAgent: false,
      canAccessAutomations: false, canAccessSettings: false,
      canAccessSettingsWhatsapp: false, canAccessSettingsProxies: false,
      canAccessSettingsAi: false, canManageUsers: false,
      canManageDepartments: false, canManageRolePermissions: false,
    },
  },
];

type RolePermissionsState = Record<UserType, Partial<PermissionMap>>;
type SavingState = Partial<Record<UserType, boolean>>;

export function PermissionsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const [rolePerms, setRolePerms] = useState<RolePermissionsState>(() =>
    Object.fromEntries(ROLES.map((r) => [r.value, { ...r.defaultPermissions }])) as RolePermissionsState
  );
  const [savedPerms, setSavedPerms] = useState<RolePermissionsState>(() =>
    Object.fromEntries(ROLES.map((r) => [r.value, { ...r.defaultPermissions }])) as RolePermissionsState
  );
  const [saving, setSaving] = useState<SavingState>({});
  const [savingAll, setSavingAll] = useState(false);

  // Load departments
  useEffect(() => {
    setLoadingDepts(true);
    accountsApi.listDepartments()
      .then((res) => {
        const depts = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
        setDepartments(depts);
        if (depts.length > 0) setSelectedDeptId(depts[0].id);
      })
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoadingDepts(false));
  }, []);

  // Load permissions when department changes
  const loadPermissions = useCallback(async (deptId: string) => {
    setLoadingPerms(true);
    try {
      const res = await accountsApi.listDepartmentRolePermissions({ department: deptId });
      const serverPerms = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];

      const newState: RolePermissionsState = Object.fromEntries(
        ROLES.map((r) => {
          const found = (serverPerms as DepartmentRolePermission[]).find((p) => p.role === r.value);
          return [r.value, found ? { ...r.defaultPermissions, ...found.permissions } : { ...r.defaultPermissions }];
        })
      ) as RolePermissionsState;

      setRolePerms(newState);
      setSavedPerms(JSON.parse(JSON.stringify(newState)));
    } catch {
      toast.error('Failed to load permissions for this department');
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDeptId) loadPermissions(selectedDeptId);
  }, [selectedDeptId, loadPermissions]);

  const handleToggle = (role: UserType, key: PermissionKey, value: boolean) => {
    setRolePerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: value },
    }));
  };

  const handleSetRoleAll = (role: UserType, value: boolean) => {
    const updated = Object.fromEntries(ALL_MODULES.map((m) => [m.key, value]));
    setRolePerms((prev) => ({
      ...prev,
      [role]: updated,
    }));
  };

  const handleSaveRole = async (role: UserType) => {
    if (!selectedDeptId) return;
    setSaving((s) => ({ ...s, [role]: true }));
    try {
      await accountsApi.upsertDepartmentRolePermission({
        department: selectedDeptId,
        role,
        permissions: rolePerms[role],
      });
      setSavedPerms((prev) => ({
        ...prev,
        [role]: JSON.parse(JSON.stringify(rolePerms[role])),
      }));
      toast.success(`${ROLES.find((r) => r.value === role)?.label} permissions updated`);
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving((s) => ({ ...s, [role]: false }));
    }
  };

  const isRoleDirty = (role: UserType) => {
    return JSON.stringify(rolePerms[role]) !== JSON.stringify(savedPerms[role]);
  };

  const dirtyRoles = ROLES.filter((r) => isRoleDirty(r.value));
  const hasAnyUnsaved = dirtyRoles.length > 0;

  const handleSaveAll = async () => {
    if (!selectedDeptId || dirtyRoles.length === 0) return;
    setSavingAll(true);
    try {
      await Promise.all(
        dirtyRoles.map((r) =>
          accountsApi.upsertDepartmentRolePermission({
            department: selectedDeptId,
            role: r.value,
            permissions: rolePerms[r.value],
          })
        )
      );
      setSavedPerms(JSON.parse(JSON.stringify(rolePerms)));
      toast.success('All department role permissions saved');
    } catch {
      toast.error('Failed to save some permissions');
    } finally {
      setSavingAll(false);
    }
  };

  const handleDiscardChanges = () => {
    setRolePerms(JSON.parse(JSON.stringify(savedPerms)));
    toast.success('Changes discarded');
  };

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  return (
    <div className="space-y-6">
      {/* Top Header & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            Role Access & Permissions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure matrix access control for each role across your company departments.
          </p>
        </div>

        {/* Global Save Bar when dirty */}
        {hasAnyUnsaved && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 px-3.5 py-2 rounded-xl text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              {dirtyRoles.length} role{dirtyRoles.length > 1 ? 's' : ''} modified
            </span>
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-amber-200 dark:border-amber-900/60">
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={savingAll}
                className="px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={savingAll}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {savingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {savingAll ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
        )}
      </div>


      {loadingDepts ? (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          <span className="text-sm font-medium">Loading organization structure…</span>
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No departments configured</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Create departments in the Departments tab to begin configuring role permissions and access levels.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Horizontal Department Selector Bar */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Select Department
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {departments.map((dept) => {
                const isSelected = dept.id === selectedDeptId;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`group flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 border ${isSelected
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                  >
                    <Building2 className={`h-3.5 w-3.5 ${isSelected ? 'text-white/80 dark:text-slate-900/80' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{dept.name}</span>
                    {!dept.is_active && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isSelected
                        ? 'bg-white/10 text-white/80 dark:bg-slate-900/10 dark:text-slate-900/80'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                        Inactive
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Permission Matrix */}
          {selectedDept && (
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              {/* Matrix Top Info Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedDept.name} Access Matrix
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${selectedDept.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                    {selectedDept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {loadingPerms ? (
                <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  <span className="text-sm">Loading department permissions…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                        <th className="py-4 px-6 text-xs font-bold text-slate-600 dark:text-slate-300 w-1/3">
                          Module / Capability
                        </th>
                        {ROLES.map((role) => {
                          const dirty = isRoleDirty(role.value);
                          const isSaving = !!saving[role.value];
                          const enabledCount = ALL_MODULES.filter((m) => rolePerms[role.value]?.[m.key]).length;

                          return (
                            <th key={role.value} className="py-4 px-4 text-center border-l border-slate-100 dark:border-slate-800/60 w-1/6">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${role.badgeBg}`}>
                                  {role.label}
                                </span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  {enabledCount}/{ALL_MODULES.length} modules
                                </span>
                                <div className="flex items-center gap-2 mt-1 text-[10px] font-normal">
                                  <button
                                    type="button"
                                    onClick={() => handleSetRoleAll(role.value, true)}
                                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 transition"
                                  >
                                    All
                                  </button>
                                  <span className="text-slate-300 dark:text-slate-700">·</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetRoleAll(role.value, false)}
                                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 transition"
                                  >
                                    None
                                  </button>
                                </div>
                                {dirty && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRole(role.value)}
                                    disabled={isSaving}
                                    className="mt-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-[10px] rounded shadow-sm flex items-center gap-1 transition"
                                  >
                                    {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
                                    Save
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                      {CATEGORIES.map((cat) => {
                        const mods = ALL_MODULES.filter((m) => m.category === cat);
                        return (
                          <React.Fragment key={cat}>
                            {/* Category Section Header */}
                            <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                              <td colSpan={ROLES.length + 1} className="py-2.5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {cat} Modules
                              </td>
                            </tr>
                            {/* Category Modules */}
                            {mods.map((mod) => (
                              <tr key={mod.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3.5 px-6">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                    {mod.label}
                                  </div>
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                    {mod.description}
                                  </div>
                                </td>
                                {ROLES.map((role) => {
                                  const checked = !!rolePerms[role.value]?.[mod.key];
                                  return (
                                    <td
                                      key={role.value}
                                      className="py-3.5 px-4 text-center border-l border-slate-100 dark:border-slate-800/60 cursor-pointer select-none"
                                      onClick={() => handleToggle(role.value, mod.key, !checked)}
                                    >
                                      <div className="inline-flex items-center justify-center">
                                        <div
                                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${checked
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                            : 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400'
                                            }`}
                                        >
                                          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
