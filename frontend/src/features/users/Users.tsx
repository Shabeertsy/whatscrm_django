import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Pencil,
  Search,
  Building2,
  Shield,
  Mail,
  Phone,
  UserCheck,
  X,
  MapPin,
  ShieldCheck,
  UserCheck2,
  MessageSquare,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { TablePagination } from '../../components/shared/TablePagination';
import { accountsApi, User, UserPayload, Department, Location, UserType } from '../../api/accounts';
import toast from 'react-hot-toast';
import { UserModal } from '../settings/components/modals/UserModal';

export function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, locsRes] = await Promise.all([
        accountsApi.listUsers(),
        accountsApi.listDepartments(),
        accountsApi.listLocations(),
      ]);
      const usersData = usersRes.data;
      const deptsData = deptsRes.data;
      const locsData = locsRes.data;
      setUsers(Array.isArray(usersData) ? usersData : (usersData as any).results ?? []);
      setDepartments(Array.isArray(deptsData) ? deptsData : (deptsData as any).results ?? []);
      setLocations(Array.isArray(locsData) ? locsData : (locsData as any).results ?? []);
    } catch {
      toast.error('Failed to load users or departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [locations]);

  // Statistics calculation
  const stats = useMemo(() => {
    const nonSuperusers = users.filter((u) => !u.is_superuser);
    const activeCount = nonSuperusers.filter((u) => u.is_active).length;
    const agentCount = nonSuperusers.filter((u) => u.user_type === 'agent').length;
    const adminCount = nonSuperusers.filter((u) => u.user_type === 'admin').length;

    return {
      total: nonSuperusers.length,
      active: activeCount,
      agents: agentCount,
      admins: adminCount,
    };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.is_superuser) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matchesName = fullName.includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone_number?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      // Department filter
      if (selectedDeptFilter !== 'all') {
        if (selectedDeptFilter === 'none') {
          if (u.department) return false;
        } else {
          if (u.department !== selectedDeptFilter) return false;
        }
      }

      // Role filter
      if (selectedRoleFilter !== 'all') {
        if (u.user_type !== selectedRoleFilter) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'active' && !u.is_active) return false;
        if (selectedStatusFilter === 'inactive' && u.is_active) return false;
      }

      return true;
    });
  }, [users, searchQuery, selectedDeptFilter, selectedRoleFilter, selectedStatusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedDeptFilter, selectedRoleFilter, selectedStatusFilter]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const handleSave = async (payload: UserPayload) => {
    try {
      if (editTarget) {
        await accountsApi.updateUser(editTarget.id, payload);
        toast.success('User updated successfully');
      } else {
        await accountsApi.createUser(payload);
        toast.success('User created successfully');
      }
      await fetchData();
    } catch (error) {
      toast.error('Failed to save user account');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await accountsApi.deleteUser(deleteTargetId);
      setUsers((prev) => prev.filter((i) => i.id !== deleteTargetId));
      toast.success('User deleted successfully');
      setDeleteTargetId(null);
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await accountsApi.toggleUserActive(id, currentStatus);
      await fetchData();
      toast.success(currentStatus ? 'User deactivated' : 'User activated');
    } catch {
      toast.error('Failed to toggle user status');
    } finally {
      setTogglingId(null);
    }
  };

  const getRoleBadge = (role: UserType) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            Admin
          </span>
        );
      case 'agent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            CRM Agent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Staff
          </span>
        );
    }
  };

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Users & Roles
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage team agents, department assignments, and system accounts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditTarget(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add User Account
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <UsersIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-500 font-medium">Total Users</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
            <p className="text-xs text-slate-500 font-medium">Active Members</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <UserCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.agents}</p>
            <p className="text-xs text-slate-500 font-medium">CRM Agents</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.admins}</p>
            <p className="text-xs text-slate-500 font-medium">Admins</p>
          </div>
        </div>
      </div>

      {/* Filters bar - exact style matching Contacts page */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800">
        <div className="flex-1 min-w-[240px] relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#007e3a] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
          >
            <option value="all">All Departments</option>
            <option value="none">No Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="agent">CRM Agent</option>
            <option value="staff">Staff</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#007e3a] transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Data Table - exact style matching Contacts page */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#007e3a] mx-auto mb-2" />
                    <span className="text-xs text-slate-400 font-medium">Loading team users...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <UsersIcon className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {users.length === 0 ? 'No user accounts created yet' : 'No users match your filters'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {users.length === 0
                          ? 'Click "+ Add User Account" to add team members and agents.'
                          : 'Try modifying your search or dropdown filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const fullName =
                    `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unnamed User';
                  const deptName =
                    user.department_name || (user.department ? departmentMap.get(user.department) : null);
                  const locName = user.location ? locationMap.get(user.location) : null;

                  return (
                    <tr
                      key={user.id}
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      {/* User Column */}
                      <td className="px-6 py-3.5">
                        <div
                          className="flex items-center gap-3 min-w-[180px] select-none"
                        >
                          <div
                            className={`h-9 w-9 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform group-hover:scale-105 ${
                              user.is_active
                                ? 'bg-gradient-to-br from-[#007e3a]/20 to-emerald-500/10 text-[#007e3a] dark:text-emerald-400 border border-[#007e3a]/30'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {getInitials(user)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white text-sm leading-snug truncate group-hover:text-[#007e3a] dark:group-hover:text-emerald-400 transition-colors">
                              {fullName}
                            </span>
                            {user.username && user.username !== user.email && (
                              <span className="text-xs text-slate-400 truncate">@{user.username}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col gap-0.5 min-w-[160px]">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </span>
                          {user.phone_number ? (
                            <a
                              href={`tel:${user.phone_number}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#007e3a] transition-colors w-fit"
                              title="Call user"
                            >
                              <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="font-mono">{user.phone_number}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-6 py-3.5 whitespace-nowrap">{getRoleBadge(user.user_type)}</td>

                      {/* Department Column */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {deptName ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeptFilter(user.department || 'all');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 transition"
                            title="Filter by this department"
                          >
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            {deptName}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Location Column */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {locName ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            {locName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              user.is_active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {user.is_active && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(user.id, user.is_active);
                            }}
                            disabled={togglingId === user.id}
                            title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            className="p-1 text-slate-400 hover:text-[#007e3a] transition rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {togglingId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" />
                            ) : user.is_active ? (
                              <ToggleRight className="h-4 w-4 text-[#007e3a] dark:text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/users/${user.id}`);
                            }}
                            title="View Assigned Chats & Analytics"
                            className="p-1.5 text-slate-400 hover:text-[#007e3a] dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget(user);
                              setModalOpen(true);
                            }}
                            title="Edit User Account"
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(user.id);
                            }}
                            title="Delete User Account"
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {filteredUsers.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={filteredUsers.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            loading={loading}
            itemLabel="users"
          />
        )}
      </div>

      {modalOpen && (
        <UserModal
          initial={editTarget}
          departments={departments}
          locations={locations}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete User Account"
        description="Are you sure you want to delete this user? They will lose all access to the CRM and conversation assignments."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default Users;
