import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
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
  Filter,
  UserCheck,
  UserX
} from 'lucide-react';
import { ConfirmDialog } from '../../../../components/shared/ConfirmDialog';
import { accountsApi, User, UserPayload, Department, Location, UserType } from '../../../../api/accounts';
import toast from 'react-hot-toast';
import { UserModal } from '../modals/UserModal';

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

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

      return true;
    });
  }, [users, searchQuery, selectedDeptFilter, selectedRoleFilter]);

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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to toggle user status');
    } finally {
      setTogglingId(null);
    }
  };

  const getRoleBadge = (role: UserType) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Admin</span>;
      case 'agent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">CRM Agent</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Staff</span>;
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
    <div className="space-y-5">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Team Members & Users
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#007e3a]/10 text-[#007e3a] dark:text-emerald-400 font-semibold border border-[#007e3a]/20">
              {users.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create user accounts, assign roles, and structure agents into departments.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow"
        >
          <Plus className="h-4 w-4" />
          Add User Account
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition"
          />
        </div>

        <div className="md:col-span-3">
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition appearance-none"
            >
              <option value="all">All Departments</option>
              <option value="none">No Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="relative">
            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="agent">CRM Agent</option>
              <option value="staff">General Staff</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#007e3a]" />
          <p className="text-xs text-slate-400">Loading team users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[#007e3a]/10 text-[#007e3a] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery || selectedDeptFilter !== 'all' || selectedRoleFilter !== 'all'
              ? 'No matching users found'
              : 'No team users created yet'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery || selectedDeptFilter !== 'all' || selectedRoleFilter !== 'all'
              ? 'Try modifying your search query or dropdown filters.'
              : 'Add user accounts to let your team collaborate, manage conversations, and handle tickets.'}
          </p>
          {!searchQuery && selectedDeptFilter === 'all' && selectedRoleFilter === 'all' && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add User Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUsers.map((user) => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unnamed User';
            const deptName = user.department_name || (user.department ? departmentMap.get(user.department) : null);

            return (
              <div
                key={user.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    user.is_active
                      ? 'bg-gradient-to-br from-[#007e3a]/20 to-emerald-500/10 text-[#007e3a] dark:text-emerald-400 border border-[#007e3a]/30'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {getInitials(user)}
                  </div>

                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{fullName}</h3>
                      {getRoleBadge(user.user_type)}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {user.is_active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {user.email}
                      </span>

                      {user.phone_number && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {user.phone_number}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedDeptFilter(user.department || 'none')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          deptName
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                        title="Click to filter by this department"
                      >
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        {deptName || 'No Department'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleToggle(user.id, user.is_active)}
                    disabled={togglingId === user.id}
                    title={user.is_active ? 'Deactivate User Account' : 'Activate User Account'}
                    className="p-2 text-slate-400 hover:text-[#007e3a] transition"
                  >
                    {togglingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" />
                    ) : user.is_active ? (
                      <ToggleRight className="h-5 w-5 text-[#007e3a] dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>

                  <button
                    onClick={() => { setEditTarget(user); setModalOpen(true); }}
                    title="Edit User Account"
                    className="p-2 text-slate-400 hover:text-blue-600 transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setDeleteTargetId(user.id)}
                    title="Delete User Account"
                    className="p-2 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
