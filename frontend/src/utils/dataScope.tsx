/**
 * src/utils/dataScope.ts
 * ──────────────────────
 * Reusable hooks for permission gating and scoped data fetching.
 *
 * Usage:
 *
 *   // Gate an entire page:
 *   const { allowed } = usePermissionGate('canAccessChats');
 *   if (!allowed) return <AccessDenied />;
 *
 *   // Get API query params scoped to this user:
 *   const scopeParams = useDataScopeParams();
 *   messagingApi.listConversations(scopeParams);
 */

import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { getUserPermissions, type UserPermissions } from './permissions';
import type { PermissionKey } from '../api/accounts';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the authenticated user from the global auth store. */
export function useCurrentUser() {
  const [authState] = useAuthStore();
  return authState.user ?? null;
}

/** Returns the fully resolved UserPermissions for the current user. */
export function usePermissions(): UserPermissions {
  const user = useCurrentUser();
  return useMemo(() => getUserPermissions(user), [user]);
}


// ─── Permission Gate ───────────────────────────────────────────────────────────

export interface PermissionGateResult {
  /** True when the user holds the required permission. */
  allowed: boolean;
  /** True when the user is a superuser / owner (always allowed). */
  isSuperuser: boolean;
  /** True while auth state is loading (not yet resolved). */
  isLoading: boolean;
}

/**
 * usePermissionGate
 * -----------------
 * Returns whether the current user holds a given permission.
 * Superusers always pass.
 *
 * @example
 *   const { allowed } = usePermissionGate('canAccessChats');
 *   if (!allowed) return <AccessDenied />;
 */
export function usePermissionGate(permissionKey: PermissionKey): PermissionGateResult {
  const [authState] = useAuthStore();
  const permissions = usePermissions();

  const isSuperuser =
    authState.user?.is_superuser === true || authState.user?.role === 'Owner';

  const allowed = isSuperuser || Boolean(permissions[permissionKey]);

  return {
    allowed,
    isSuperuser,
    isLoading: !authState.isAuthenticated,
  };
}


// ─── Scoped Data Params ───────────────────────────────────────────────────────

export interface DataScopeParams {
  /** The user's location ID — pass to APIs that support location filtering. */
  location?: string;
  /** The user's department ID — pass to APIs that support dept filtering. */
  department?: string;
}

/**
 * useDataScopeParams
 * ------------------
 * Returns query params based on the current user's location and department.
 * Superusers get empty params (no restriction).
 * Non-superusers get their location/department IDs.
 *
 * @example
 *   const scopeParams = useDataScopeParams();
 *   // scopeParams = { location: 'abc-123', department: 'def-456' }
 *   messagingApi.listConversations(scopeParams);
 */
export function useDataScopeParams(): DataScopeParams {
  const user = useCurrentUser();

  return useMemo(() => {
    if (!user) return {};
    if (user.is_superuser || user.role === 'Owner') return {};

    const params: DataScopeParams = {};
    if (user.location) params.location = user.location;
    if (user.department) params.department = user.department;
    return params;
  }, [user]);
}


// ─── Access Denied Screen ─────────────────────────────────────────────────────

/**
 * AccessDenied
 * ------------
 * A simple, reusable access-denied component to render when a permission gate
 * fails. Import and use directly in any page component.
 *
 * @example
 *   import { AccessDenied } from '../utils/dataScope';
 *   const { allowed } = usePermissionGate('canAccessChats');
 *   if (!allowed) return <AccessDenied module="Live Chats" />;
 */
import React from 'react';
import { ShieldOff } from 'lucide-react';

export function AccessDenied({ module = 'this module' }: { module?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-5 shadow-sm">
        <ShieldOff className="h-8 w-8 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
        Access Restricted
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
        You don't have permission to access{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">{module}</span>.
        Please contact your administrator.
      </p>
    </div>
  );
}
