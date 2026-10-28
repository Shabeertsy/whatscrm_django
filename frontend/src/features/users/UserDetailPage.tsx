import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  Building2,
  MapPin,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  CheckCircle2,
  Send,
  PieChart,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
} from 'lucide-react';
import { accountsApi, User, UserChatAnalytics, UserPayload, Department, Location } from '../../api/accounts';
import { messagingApi, Conversation } from '../../api/messaging';
import { formatMessagePreview } from '../inbox/utils/formatMessagePreview';
import { UserModal } from '../settings/components/modals/UserModal';
import toast from 'react-hot-toast';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [analytics, setAnalytics] = useState<UserChatAnalytics | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Filters for assigned chats
  const [chatSearch, setChatSearch] = useState('');
  const [chatStatusFilter, setChatStatusFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');

  // Load user data, analytics, departments and locations
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function loadUserData() {
      setLoading(true);
      try {
        const [userRes, analyticsRes, deptsRes, locsRes] = await Promise.allSettled([
          accountsApi.getUser(id!),
          accountsApi.getUserAnalytics(id!),
          accountsApi.listDepartments(),
          accountsApi.listLocations(),
        ]);

        if (!isMounted) return;

        if (userRes.status === 'fulfilled') {
          setUser(userRes.value.data);
        } else {
          toast.error('Failed to load user details');
        }

        if (analyticsRes.status === 'fulfilled') {
          setAnalytics(analyticsRes.value.data);
        }

        if (deptsRes.status === 'fulfilled') {
          const dData = deptsRes.value.data;
          setDepartments(Array.isArray(dData) ? dData : (dData as any).results ?? []);
        }

        if (locsRes.status === 'fulfilled') {
          const lData = locsRes.value.data;
          setLocations(Array.isArray(lData) ? lData : (lData as any).results ?? []);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Load assigned conversations for this user
  const fetchAssignedChats = async () => {
    if (!id) return;
    setLoadingChats(true);
    try {
      const res = await messagingApi.listConversations({
        agent_id: id,
        limit: 100,
      });
      setConversations(res.data.results || []);
    } catch (err) {
      console.error('Failed to load assigned chats:', err);
      toast.error('Could not load assigned chats');
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssignedChats();
    }
  }, [id]);

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

  // Toggle user active status
  const handleToggleActive = async () => {
    if (!user) return;
    setTogglingActive(true);
    try {
      const res = await accountsApi.toggleUserActive(user.id, user.is_active);
      setUser(res.data);
      toast.success(res.data.is_active ? 'User activated' : 'User deactivated');
    } catch {
      toast.error('Failed to toggle user status');
    } finally {
      setTogglingActive(false);
    }
  };

  // Edit user account save
  const handleSaveUser = async (payload: UserPayload) => {
    if (!user) return;
    try {
      const res = await accountsApi.updateUser(user.id, payload);
      setUser(res.data);
      setEditModalOpen(false);
      toast.success('User updated successfully');
    } catch {
      toast.error('Failed to update user');
    }
  };

  // Filter conversations based on search and status
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (chatStatusFilter !== 'all' && c.status !== chatStatusFilter) {
        return false;
      }
      if (chatSearch.trim()) {
        const q = chatSearch.toLowerCase();
        const contactName = (c.contact?.name || '').toLowerCase();
        const phone = (c.contact?.phone || '').toLowerCase();
        const preview = formatMessagePreview(c.last_message);
        return contactName.includes(q) || phone.includes(q) || preview.text.toLowerCase().includes(q);
      }
      return true;
    });
  }, [conversations, chatStatusFilter, chatSearch]);

  const initials = useMemo(() => {
    if (!user) return 'U';
    const first = (user.first_name || '').trim().charAt(0);
    const last = (user.last_name || '').trim().charAt(0);
    if (first && last) return `${first}${last}`.toUpperCase();
    if (first) return first.toUpperCase();
    return (user.username || user.email || 'U').charAt(0).toUpperCase();
  }, [user]);

  // Chat status counts for metrics and chart
  const openCount = analytics?.open_chats ?? conversations.filter((c) => c.status === 'open').length;
  const pendingCount = analytics?.pending_chats ?? conversations.filter((c) => c.status === 'pending').length;
  const resolvedCount = analytics?.resolved_chats ?? conversations.filter((c) => c.status === 'resolved').length;

  const totalStatusChats = openCount + pendingCount + resolvedCount;

  // Pie chart calculation
  const pieData = useMemo(() => {
    if (totalStatusChats === 0) return null;
    const C = 2 * Math.PI * 52; // circumference for r=52
    const openDash = (openCount / totalStatusChats) * C;
    const pendingDash = (pendingCount / totalStatusChats) * C;
    const resolvedDash = (resolvedCount / totalStatusChats) * C;

    return {
      C,
      open: {
        dash: openDash,
        offset: 0,
        percent: Math.round((openCount / totalStatusChats) * 100),
      },
      pending: {
        dash: pendingDash,
        offset: -openDash,
        percent: Math.round((pendingCount / totalStatusChats) * 100),
      },
      resolved: {
        dash: resolvedDash,
        offset: -(openDash + pendingDash),
        percent: Math.round((resolvedCount / totalStatusChats) * 100),
      },
    };
  }, [openCount, pendingCount, resolvedCount, totalStatusChats]);

  const formatChatTime = (timestamp?: string | null) => {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#007e3a] mb-2" />
        <p className="text-xs text-slate-400 font-medium">Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">User Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">This user account does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007e3a] text-white text-xs font-semibold hover:bg-[#006830] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
        </button>
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User';
  const deptName = user.department_name || (user.department ? departmentMap.get(user.department) : null);
  const locName = user.location_name || (user.location ? locationMap.get(user.location) : null);

  const totalAssigned = analytics?.total_assigned ?? conversations.length;
  const sentCount = analytics?.total_messages_sent ?? 0;
  const dealsCount = analytics?.deal_count ?? 0;
  const dealsValue = analytics?.total_deal_value ?? 0;

  return (
    <div className="space-y-5 pb-10">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Users &amp; Roles</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{fullName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={togglingActive}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition ${user.is_active
              ? 'border-emerald-200 dark:border-emerald-800/60 text-[#007e3a] dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40'
              }`}
            title="Toggle active status"
          >
            {togglingActive ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : user.is_active ? (
              <ToggleRight className="h-4 w-4 text-[#007e3a] dark:text-emerald-400" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            <span>{user.is_active ? 'Active' : 'Inactive'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Pencil className="h-3 w-3 text-slate-400" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* User Info Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200">
              {initials}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                {fullName}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                {user.user_type}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 text-slate-400" />
                <a href={`mailto:${user.email}`} className="hover:text-slate-800 dark:hover:text-slate-200 transition">
                  {user.email}
                </a>
              </span>

              {user.phone_number && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <a href={`tel:${user.phone_number}`} className="hover:text-slate-800 dark:hover:text-slate-200 transition">
                    {user.phone_number}
                  </a>
                </span>
              )}

              {deptName && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                  <Building2 className="h-3 w-3" />
                  <span>{deptName}</span>
                </span>
              )}

              {locName && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span>{locName}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Assigned Chats</span>
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {totalAssigned}
          </div>
          <div className="text-[11px] text-[#007e3a] dark:text-emerald-400 font-medium mt-0.5">
            {openCount} active
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Resolved</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {resolvedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalAssigned > 0 ? `${Math.round((resolvedCount / totalAssigned) * 100)}% resolved` : '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Messages Sent</span>
            <Send className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {sentCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Outbound messages
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Pipeline Deals</span>
            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {dealsCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            ₹{dealsValue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Chat Status Distribution Pie Chart Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 ">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-[#007e3a] dark:text-emerald-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Chat Status Distribution
            </h2>
            <span className="text-[11px] text-slate-400">
              (Live assigned chats)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Total: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{totalStatusChats}</strong>
            </span>
            {chatStatusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setChatStatusFilter('all')}
                className="text-[10px] text-[#007e3a] dark:text-emerald-400 font-semibold hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {totalStatusChats === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No chats assigned to this user yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/80 items-center py-2">
            {/* Left Half: Chart */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 140 140" className="w-36 h-36 -rotate-90 select-none">
                  {/* Background Ring */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="14"
                    className="text-slate-100 dark:text-slate-800/50"
                  />

                  {/* Open Slice */}
                  {openCount > 0 && pieData && (
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeDasharray={`${pieData.open.dash} ${pieData.C - pieData.open.dash}`}
                      strokeDashoffset={pieData.open.offset}
                      className="text-[#007e3a] dark:text-emerald-400 cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setChatStatusFilter(chatStatusFilter === 'open' ? 'all' : 'open')}
                    />
                  )}

                  {/* Resolved Slice */}
                  {resolvedCount > 0 && pieData && (
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeDasharray={`${pieData.resolved.dash} ${pieData.C - pieData.resolved.dash}`}
                      strokeDashoffset={pieData.resolved.offset}
                      className="text-[#3b82f6] dark:text-blue-400 cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setChatStatusFilter(chatStatusFilter === 'resolved' ? 'all' : 'resolved')}
                    />
                  )}
                </svg>

                {/* Center Info Overlay (Static Total) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                    {totalStatusChats}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 capitalize mt-1 leading-tight">
                    Total Chats
                  </span>
                </div>
              </div>
            </div>

            {/* Right Half: Status Cards */}
            <div className="flex flex-col justify-center p-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {/* Open Card */}
                <button
                  type="button"
                  onClick={() => setChatStatusFilter(chatStatusFilter === 'open' ? 'all' : 'open')}
                  className={`p-3.5 rounded-lg border text-left transition-all ${chatStatusFilter === 'open'
                    ? 'border-[#007e3a] bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-[#007e3a]'
                    : 'border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#007e3a]" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Open
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
                      {pieData ? `${pieData.open.percent}%` : '0%'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1.5">
                    {openCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Needs attention
                  </div>
                </button>

                {/* Resolved Card */}
                <button
                  type="button"
                  onClick={() => setChatStatusFilter(chatStatusFilter === 'resolved' ? 'all' : 'resolved')}
                  className={`p-3.5 rounded-lg border text-left transition-all ${chatStatusFilter === 'resolved'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500'
                    : 'border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Resolved
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-full">
                      {pieData ? `${pieData.resolved.percent}%` : '0%'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1.5">
                    {resolvedCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Completed chats
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assigned Chat List Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg overflow-hidden">
        {/* Controls Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Assigned Chats
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {conversations.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="pl-7 pr-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#007e3a] w-36 sm:w-44 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-xs">
              {(['all', 'open', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setChatStatusFilter(st)}
                  className={`px-2 py-0.5 rounded capitalize transition font-medium text-[11px] ${chatStatusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-[#007e3a] dark:text-emerald-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchAssignedChats}
              disabled={loadingChats}
              title="Refresh"
              className="p-1 rounded-md border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <RefreshCw className={`h-3 w-3 ${loadingChats ? 'animate-spin text-[#007e3a]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Chats Table */}
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-2 min-w-[170px]">Contact</th>
                <th className="px-5 py-2 min-w-[280px]">Last Message</th>
                <th className="px-5 py-2 min-w-[90px]">Time</th>
                <th className="px-5 py-2 min-w-[120px]">Stage</th>
                <th className="px-5 py-2 min-w-[90px]">Status</th>
                <th className="px-5 py-2 text-right min-w-[110px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
              {loadingChats ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#007e3a] mx-auto mb-1.5" />
                    <span className="text-slate-400">Loading chats...</span>
                  </td>
                </tr>
              ) : filteredConversations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    {conversations.length === 0
                      ? 'No chats assigned to this user'
                      : 'No chats match your filter'}
                  </td>
                </tr>
              ) : (
                filteredConversations.map((conv) => {
                  const contactName = conv.contact?.name || conv.contact?.phone || 'Contact';
                  const phone = conv.contact?.phone || '';
                  const lastMsgText = conv.last_message?.body || (conv.last_message?.msg_type ? `[${conv.last_message.msg_type}]` : '—');
                  const isOutbound = conv.last_message?.direction === 'outbound';
                  const stageName = conv.contact?.stage_name;
                  const stageColor = conv.contact?.stage_color;

                  return (
                    <tr
                      key={conv.id}
                      onClick={() => navigate(`/messaging?conversation=${conv.id}`)}
                      className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      {/* Contact */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-600 dark:text-slate-300 shrink-0 overflow-hidden">
                            {conv.contact?.profile_pic_url ? (
                              <img
                                src={conv.contact.profile_pic_url}
                                alt={contactName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{contactName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                                {contactName}
                              </span>
                              {conv.unread_count > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#007e3a] text-white text-[9px] font-bold">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            {phone && (
                              <span className="text-[11px] text-slate-400 font-mono truncate">
                                {phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Last Message */}
                      <td className="px-5 py-3">
                        {(() => {
                          const preview = formatMessagePreview(conv.last_message);
                          return (
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 max-w-[320px]">
                              {isOutbound && (
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">You:</span>
                              )}

                              {/* Media Thumbnail or Icon */}
                              {preview.mediaUrl && preview.mediaType === 'image' ? (
                                <img
                                  src={preview.mediaUrl}
                                  alt="media"
                                  className="w-4 h-4 rounded object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                              ) : preview.mediaType === 'image' ? (
                                <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : preview.mediaType === 'video' ? (
                                <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              ) : preview.mediaType === 'audio' ? (
                                <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              ) : preview.mediaType === 'document' ? (
                                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              ) : null}

                              {/* Badge for template / interactive */}
                              {preview.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                                  {preview.badge}
                                </span>
                              )}

                              <span className="truncate text-slate-700 dark:text-slate-300" title={preview.text}>
                                {preview.text}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Time */}
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {formatChatTime(conv.last_message_at)}
                      </td>

                      {/* Stage */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {stageName ? (
                          <span
                            style={{
                              backgroundColor: stageColor ? `${stageColor}18` : undefined,
                              borderColor: stageColor ? `${stageColor}50` : undefined,
                              color: stageColor || undefined,
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                          >
                            {stageName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${conv.status === 'open'
                            ? 'bg-emerald-50 text-[#007e3a] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800'
                            : conv.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                          {conv.status}
                        </span>
                      </td>

                      {/* Go To Chat Action */}
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/messaging?conversation=${conv.id}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#007e3a]/10 hover:bg-[#007e3a] text-[#007e3a] hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-[#007e3a] dark:hover:text-white border border-[#007e3a]/20 dark:border-emerald-800 font-semibold transition"
                          title="Open conversation in Live Chat"
                        >
                          <span>Go to chat</span>
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && user && (
        <UserModal
          initial={user}
          departments={departments}
          locations={locations}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
