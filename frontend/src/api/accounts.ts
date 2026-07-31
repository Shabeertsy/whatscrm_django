import { apiClient } from './client';

export interface Location {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationPayload {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  location_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentPayload {
  name: string;
  description?: string;
  is_active?: boolean;
}

export type UserType = 'admin' | 'agent' | 'staff';

export type PermissionKey =
  | 'canAccessDashboard'
  | 'canAccessChats'
  | 'canAccessPipeline'
  | 'canAccessContacts'
  | 'canAccessHotels'
  | 'canAccessTemplates'
  | 'canAccessCustomMessages'
  | 'canAccessMedia'
  | 'canAccessAiAgent'
  | 'canAccessAutomations'
  | 'canAccessSettings'
  | 'canAccessSettingsWhatsapp'
  | 'canAccessSettingsProxies'
  | 'canAccessSettingsAi'
  | 'canManageUsers'
  | 'canManageDepartments'
  | 'canManageRolePermissions';

export type PermissionMap = Record<PermissionKey, boolean>;

export interface DepartmentRolePermission {
  id: string;
  department: string;
  department_name: string;
  role: UserType;
  permissions: Partial<PermissionMap>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  user_type: UserType;
  department?: string | null;
  department_name?: string | null;
  location?: string | null;
  location_name?: string | null;
  is_active: boolean;
  is_superuser?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPayload {
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  user_type?: UserType;
  department?: string | null;
  location?: string | null;
  password?: string;
  is_active?: boolean;
}

export const accountsApi = {
  // Locations CRUD
  listLocations: () => apiClient.get<Location[]>('/accounts/locations/'),
  getLocation: (id: string) => apiClient.get<Location>(`/accounts/locations/${id}/`),
  createLocation: (payload: LocationPayload) => apiClient.post<Location>('/accounts/locations/', payload),
  updateLocation: (id: string, payload: Partial<LocationPayload>) => apiClient.patch<Location>(`/accounts/locations/${id}/`, payload),
  deleteLocation: (id: string) => apiClient.delete(`/accounts/locations/${id}/`),
  toggleLocationActive: async (id: string, currentStatus: boolean) => {
    return apiClient.patch<Location>(`/accounts/locations/${id}/`, { is_active: !currentStatus });
  },

  // Departments CRUD
  listDepartments: () => apiClient.get<Department[]>('/accounts/departments/'),
  getDepartment: (id: string) => apiClient.get<Department>(`/accounts/departments/${id}/`),
  createDepartment: (payload: DepartmentPayload) => apiClient.post<Department>('/accounts/departments/', payload),
  updateDepartment: (id: string, payload: Partial<DepartmentPayload>) => apiClient.patch<Department>(`/accounts/departments/${id}/`, payload),
  deleteDepartment: (id: string) => apiClient.delete(`/accounts/departments/${id}/`),
  toggleDepartmentActive: async (id: string, currentStatus: boolean) => {
    return apiClient.patch<Department>(`/accounts/departments/${id}/`, { is_active: !currentStatus });
  },

  // Department Role Permissions
  listDepartmentRolePermissions: (params?: { department?: string; role?: string }) =>
    apiClient.get<DepartmentRolePermission[]>('/accounts/department-role-permissions/', { params }),
  upsertDepartmentRolePermission: (payload: { department: string; role: UserType; permissions: Partial<PermissionMap> }) =>
    apiClient.post<DepartmentRolePermission>('/accounts/department-role-permissions/upsert/', payload),
  deleteDepartmentRolePermission: (id: string) =>
    apiClient.delete(`/accounts/department-role-permissions/${id}/`),

  // Users CRUD
  listUsers: (params?: { department?: string; user_type?: string }) => apiClient.get<User[]>('/accounts/users/', { params }),
  getUser: (id: string) => apiClient.get<User>(`/accounts/users/${id}/`),
  createUser: (payload: UserPayload) => apiClient.post<User>('/accounts/users/', payload),
  updateUser: (id: string, payload: Partial<UserPayload>) => apiClient.patch<User>(`/accounts/users/${id}/`, payload),
  deleteUser: (id: string) => apiClient.delete(`/accounts/users/${id}/`),
  toggleUserActive: async (id: string, currentStatus: boolean) => {
    return apiClient.patch<User>(`/accounts/users/${id}/`, { is_active: !currentStatus });
  }
};
