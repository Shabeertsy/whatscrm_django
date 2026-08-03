import type { UserType, PermissionKey, PermissionMap, DepartmentRolePermission } from '../api/accounts';
import { accountsApi } from '../api/accounts';

// ─── Default permissions per role (used as fallback when no DB record exists) ─

export const DEFAULT_PERMISSIONS: Record<UserType, Partial<PermissionMap>> = {
  admin: {
    canAccessDashboard: true,
    canAccessChats: true,
    canAccessPipeline: true,
    canAccessContacts: true,
    canAccessHotels: true,
    canAccessTemplates: true,
    canAccessCustomMessages: true,
    canAccessMedia: true,
    canAccessAiAgent: true,
    canAccessAutomations: true,
    canAccessSettings: true,
    canAccessSettingsWhatsapp: true,
    canAccessSettingsProxies: true,
    canAccessSettingsAi: true,
    canManageUsers: true,
    canManageDepartments: true,
    canManageRolePermissions: true,
  },
  agent: {
    canAccessDashboard: true,
    canAccessChats: true,
    canAccessPipeline: true,
    canAccessContacts: true,
    canAccessHotels: true,
    canAccessTemplates: false,
    canAccessCustomMessages: false,
    canAccessMedia: false,
    canAccessAiAgent: false,
    canAccessAutomations: false,
    canAccessSettings: false,
    canAccessSettingsWhatsapp: false,
    canAccessSettingsProxies: false,
    canAccessSettingsAi: false,
    canManageUsers: false,
    canManageDepartments: false,
    canManageRolePermissions: false,
  },
  staff: {
    canAccessDashboard: true,
    canAccessChats: false,
    canAccessPipeline: false,
    canAccessContacts: true,
    canAccessHotels: true,
    canAccessTemplates: false,
    canAccessCustomMessages: false,
    canAccessMedia: false,
    canAccessAiAgent: false,
    canAccessAutomations: false,
    canAccessSettings: false,
    canAccessSettingsWhatsapp: false,
    canAccessSettingsProxies: false,
    canAccessSettingsAi: false,
    canManageUsers: false,
    canManageDepartments: false,
    canManageRolePermissions: false,
  },
};

export type UserPermissions = Partial<PermissionMap> & {
  dataScope: 'all' | 'department_only' | 'assigned_only';
  roleLabel: string;
  roleBadgeColor: string;
};

function roleMeta(userType: UserType): { roleLabel: string; roleBadgeColor: string; dataScope: 'all' | 'department_only' | 'assigned_only' } {
  switch (userType) {
    case 'admin':
      return {
        roleLabel: 'Admin',
        roleBadgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        dataScope: 'all',
      };
    case 'agent':
      return {
        roleLabel: 'CRM Agent',
        roleBadgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
        dataScope: 'department_only',
      };
    case 'staff':
    default:
      return {
        roleLabel: 'General Staff',
        roleBadgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        dataScope: 'department_only',
      };
  }
}

/**
 * Synchronous: compute permissions from user object + optional pre-fetched
 * DepartmentRolePermission records. Falls back to defaults if no server record found.
 */
export function getUserPermissions(
  user?: {
    user_type?: UserType;
    role?: string;
    is_superuser?: boolean;
    department?: string | null;
    permissions?: Partial<PermissionMap>;
  } | null,
  departmentRolePerms?: DepartmentRolePermission[]
): UserPermissions {
  const isSuper = user?.is_superuser || user?.role === 'Owner';

  if (isSuper) {
    return {
      ...DEFAULT_PERMISSIONS.admin,
      dataScope: 'all',
      roleLabel: 'Admin',
      roleBadgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    };
  }

  const userType: UserType = (user?.user_type as UserType) || 'staff';
  const meta = roleMeta(userType);
  const defaults = DEFAULT_PERMISSIONS[userType];

  // If we have pre-fetched department-role permissions, merge them
  if (departmentRolePerms && user?.department) {
    const match = departmentRolePerms.find(
      (p) => p.department === user.department && p.role === userType
    );
    if (match && Object.keys(match.permissions).length > 0) {
      return {
        ...defaults,
        ...match.permissions,
        ...meta,
      };
    }
  } else if (user?.permissions && Object.keys(user.permissions).length > 0) {
    return {
      ...defaults,
      ...user.permissions,
      ...meta,
    };
  }

  return { ...defaults, ...meta };
}

/**
 * Async version: fetch the relevant DepartmentRolePermission from API and
 * return resolved permissions. Returns defaults on error.
 */
export async function fetchAndGetUserPermissions(user?: {
  user_type?: UserType;
  role?: string;
  is_superuser?: boolean;
  department?: string | null;
} | null): Promise<UserPermissions> {
  const isSuper = user?.is_superuser || user?.role === 'Owner';
  if (isSuper) {
    return {
      ...DEFAULT_PERMISSIONS.admin,
      dataScope: 'all',
      roleLabel: 'Admin',
      roleBadgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    };
  }

  const userType: UserType = (user?.user_type as UserType) || 'staff';

  if (user?.department) {
    try {
      const res = await accountsApi.listDepartmentRolePermissions({
        department: user.department,
        role: userType,
      });
      const records = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
      return getUserPermissions(user, records);
    } catch {
      // fall through to defaults
    }
  }

  return getUserPermissions(user);
}

/**
 * Compute a human-readable summary from a permission set.
 */
export function getPermissionSummary(userType: UserType, departmentName?: string | null) {
  const perms = getUserPermissions({ user_type: userType, department: departmentName ? 'dept' : null });
  const meta = roleMeta(userType);

  const ALL_MODULE_KEYS: { key: PermissionKey; label: string }[] = [
    { key: 'canAccessDashboard', label: 'Dashboard' },
    { key: 'canAccessChats', label: 'Live Chats & Inbox' },
    { key: 'canAccessPipeline', label: 'Deals & Pipeline' },
    { key: 'canAccessContacts', label: 'Contacts Directory' },
    { key: 'canAccessHotels', label: 'Hotels & Resorts' },
    { key: 'canAccessTemplates', label: 'Message Templates' },
    { key: 'canAccessCustomMessages', label: 'Custom Messages' },
    { key: 'canAccessMedia', label: 'Media Library' },
    { key: 'canAccessAiAgent', label: 'AI Agent Config' },
    { key: 'canAccessAutomations', label: 'Workflows & Automations' },
    { key: 'canAccessSettings', label: 'System Settings' },
    { key: 'canAccessSettingsWhatsapp', label: 'Settings: WhatsApp Instances' },
    { key: 'canAccessSettingsProxies', label: 'Settings: Proxy URLs' },
    { key: 'canAccessSettingsAi', label: 'Settings: AI Providers' },
    { key: 'canManageDepartments', label: 'Settings: Departments' },
    { key: 'canManageUsers', label: 'Settings: Users & Roles' },
    { key: 'canManageRolePermissions', label: 'Settings: Role Permissions' },
  ];

  const allowedModules = ALL_MODULE_KEYS.filter((m) => perms[m.key]).map((m) => m.label);
  const restrictedModules = ALL_MODULE_KEYS.filter((m) => !perms[m.key]).map((m) => m.label);

  let scopeDescription = 'Full access across all departments and company data.';
  if (meta.dataScope === 'department_only' && departmentName) {
    scopeDescription = `Restricted to contacts and chats assigned to the "${departmentName}" department.`;
  } else if (meta.dataScope === 'department_only') {
    scopeDescription = 'Restricted to assigned department data.';
  }

  return {
    allowedModules,
    restrictedModules,
    scopeDescription,
    roleLabel: meta.roleLabel,
    roleBadgeColor: meta.roleBadgeColor,
  };
}
