import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  UserCheck,
  ChevronDown,
  X,
  Loader2,
  User2,
  UserX,
  Users,
  Building2,
  Check,
  Search,
  Shield,
  MapPin,
} from 'lucide-react';
import type { Conversation, AssignableAgent } from '../../../api/messaging';
import { messagingApi } from '../../../api/messaging';
import { accountsApi, Department } from '../../../api/accounts';
import { messagingStore } from '../../../store/messagingStore';
import { showToast } from '../../../utils/toast';

interface AssignAgentDropdownProps {
  conversation: Conversation;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function AssignAgentDropdown({ conversation }: AssignAgentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'agents' | 'departments'>('agents');
  const [searchTerm, setSearchTerm] = useState('');
  const [agents, setAgents] = useState<AssignableAgent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [fetched, setFetched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAssigned = !!conversation.assigned_agent || !!conversation.agent_name;
  const agentName = conversation.agent_name;
  const isDepartment = !conversation.assigned_agent && !!agentName;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Fetch agents and departments when opened
  const fetchData = useCallback(async () => {
    if (fetched) return;
    setIsLoading(true);
    try {
      const [agentsRes, deptsRes] = await Promise.all([
        messagingApi.listAssignableAgents(),
        accountsApi.listDepartments().catch(() => ({ data: [] })),
      ]);
      setAgents(agentsRes.data || []);
      const deptsData = deptsRes.data;
      setDepartments(Array.isArray(deptsData) ? deptsData : (deptsData as any)?.results ?? []);
      setFetched(true);
    } catch (err) {
      console.error('Failed to load assignment data:', err);
      showToast('Error', 'Could not load agents and departments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fetched]);

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      if (isDepartment) {
        setActiveTab('departments');
      } else {
        setActiveTab('agents');
      }
      setSearchTerm('');
      fetchData();
    }
  };

  // Group agents by department ID
  const deptAgentsMap = useMemo(() => {
    const map = new Map<string, AssignableAgent[]>();
    for (const a of agents) {
      if (a.department_id) {
        if (!map.has(a.department_id)) map.set(a.department_id, []);
        map.get(a.department_id)!.push(a);
      }
    }
    return map;
  }, [agents]);

  // Combined list of departments
  const allDepartments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; description?: string | null }>();
    for (const d of departments) {
      if (d.is_active !== false) {
        map.set(d.id, { id: d.id, name: d.name, description: d.description });
      }
    }
    for (const a of agents) {
      if (a.department_id && a.department_name && !map.has(a.department_id)) {
        map.set(a.department_id, { id: a.department_id, name: a.department_name });
      }
    }
    return Array.from(map.values());
  }, [departments, agents]);

  // Filtered lists based on search
  const filteredAgents = useMemo(() => {
    if (!searchTerm.trim()) return agents;
    const term = searchTerm.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        (a.user_type && a.user_type.toLowerCase().includes(term)) ||
        (a.department_name && a.department_name.toLowerCase().includes(term)) ||
        (a.location_name && a.location_name.toLowerCase().includes(term))
    );
  }, [agents, searchTerm]);

  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return allDepartments;
    const term = searchTerm.toLowerCase();
    return allDepartments.filter((d) => {
      if (d.name.toLowerCase().includes(term)) return true;
      const deptAgents = deptAgentsMap.get(d.id) || [];
      return deptAgents.some(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.email.toLowerCase().includes(term) ||
          (a.user_type && a.user_type.toLowerCase().includes(term)) ||
          (a.location_name && a.location_name.toLowerCase().includes(term))
      );
    });
  }, [allDepartments, deptAgentsMap, searchTerm]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAssignAgent = async (agentId: string, name: string) => {
    if (isAssigning) return;
    setIsAssigning(true);
    setIsOpen(false);

    const prev = {
      assigned_agent: conversation.assigned_agent,
      agent_name: conversation.agent_name,
      assigned_agents: conversation.assigned_agents,
    };

    messagingStore.updateConversationMeta(conversation.id, {
      assigned_agent: agentId,
      agent_name: name,
      assigned_agents: [agentId],
    });

    try {
      await messagingApi.updateConversation(conversation.id, { assigned_agent: agentId });
      showToast('Assigned', `Assigned to ${name}`, 'success');
    } catch (err: any) {
      messagingStore.updateConversationMeta(conversation.id, prev);
      const msg =
        err?.response?.data?.assigned_agent ||
        err?.response?.data?.detail ||
        'Failed to update assignment.';
      showToast('Error', msg, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignDepartment = async (
    deptId: string,
    deptName: string,
    roles?: string[] | null
  ) => {
    if (isAssigning) return;
    setIsAssigning(true);
    setIsOpen(false);

    const deptAgents = deptAgentsMap.get(deptId) || [];
    const roleList = roles && roles.length > 0 ? roles : null;
    const matchingAgents = roleList
      ? deptAgents.filter((a) => roleList.includes(a.user_type))
      : deptAgents;
    const count = matchingAgents.length;
    const agentLabel = count === 1 ? 'agent' : 'agents';
    const roleSuffix = roleList && roleList.length > 0
      ? ` · ${roleList.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}`
      : '';
    const displayName = `${deptName}${roleSuffix} (${count} ${agentLabel})`;

    const prev = {
      assigned_agent: conversation.assigned_agent,
      agent_name: conversation.agent_name,
      assigned_agents: conversation.assigned_agents,
    };

    messagingStore.updateConversationMeta(conversation.id, {
      assigned_agent: null,
      agent_name: displayName,
      assigned_agents: matchingAgents.map((a) => a.id),
    });

    try {
      const res = await messagingApi.updateConversation(conversation.id, {
        department_id: deptId,
        department_roles: roleList || undefined,
        department_role: roleList && roleList.length === 1 ? roleList[0] : null,
      });
      const returnedName = res?.data?.agent_name || displayName;
      showToast('Assigned', `Assigned to ${returnedName}`, 'success');
      if (res?.data) {
        messagingStore.updateConversationMeta(conversation.id, res.data);
      }
    } catch (err: any) {
      messagingStore.updateConversationMeta(conversation.id, prev);
      const msg =
        err?.response?.data?.department_id ||
        err?.response?.data?.detail ||
        'Failed to assign to department.';
      showToast('Error', msg, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (isAssigning) return;
    setIsAssigning(true);
    setIsOpen(false);

    const prev = {
      assigned_agent: conversation.assigned_agent,
      agent_name: conversation.agent_name,
      assigned_agents: conversation.assigned_agents,
    };

    messagingStore.updateConversationMeta(conversation.id, {
      assigned_agent: null,
      agent_name: null,
      assigned_agents: [],
    });

    try {
      await messagingApi.updateConversation(conversation.id, { assigned_agent: null });
      showToast('Unassigned', 'Assignment removed', 'success');
    } catch (err: any) {
      messagingStore.updateConversationMeta(conversation.id, prev);
      showToast('Error', 'Failed to unassign conversation.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button in Chat Header */}
      <button
        onClick={handleToggleOpen}
        disabled={isAssigning}
        title={
          isAssigned
            ? isDepartment
              ? `Assigned to department: ${agentName} — click to change`
              : `Assigned to ${agentName} — click to change`
            : 'Assign chat to an agent or department'
        }
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[7.5px] sm:text-[8px] md:text-[8.5px] font-medium transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 border
          ${isAssigned
            ? isDepartment
              ? 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30'
              : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          } ${isAssigning ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isAssigning ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isDepartment ? (
          <div className="h-4 w-4 rounded-full bg-sky-500 dark:bg-sky-400 flex items-center justify-center text-white flex-shrink-0">
            <Users className="h-2.5 w-2.5" />
          </div>
        ) : isAssigned ? (
          <div className="h-4 w-4 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
            {getInitials(agentName || '?')}
          </div>
        ) : (
          <UserCheck className="h-3 w-3" />
        )}
        <span className="max-w-[130px] sm:max-w-[160px] truncate">
          {isAssigned ? agentName : 'Assign Chat'}
        </span>
        {!isAssigning && (
          <ChevronDown
            className={`h-2.5 w-2.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-88 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-3.5 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase">
                Assign Chat
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('agents')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'agents'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <User2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Agents ({agents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('departments')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'departments'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-sky-500" />
                <span>Departments ({allDepartments.length})</span>
              </button>
            </div>
          </div>

          {/* Current Status & Unassign Row */}
          {isAssigned && (
            <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">
                  Assigned:
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold truncate ${
                    isDepartment
                      ? 'text-sky-700 dark:text-sky-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {isDepartment ? (
                    <Users className="h-3 w-3 shrink-0 text-sky-500" />
                  ) : (
                    <User2 className="h-3 w-3 shrink-0 text-blue-500" />
                  )}
                  <span className="truncate max-w-[170px]">{agentName}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleUnassign}
                title="Clear current assignment"
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
              >
                <UserX className="h-3 w-3" />
                <span>Unassign</span>
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'agents'
                    ? 'Search by name, role, department, location...'
                    : 'Search department or member...'
                }
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-84 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                <span className="text-xs">Loading options...</span>
              </div>
            ) : activeTab === 'agents' ? (
              /* ── AGENTS TAB: Clean Direct Selection (Like Image 1) ── */
              filteredAgents.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <User2 className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No agents found</p>
                </div>
              ) : (
                <>
                  <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                    Select an Agent
                  </div>
                  {filteredAgents.map((agent) => {
                    const isCurrentAgent = agent.id === conversation.assigned_agent;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleAssignAgent(agent.id, agent.name)}
                        disabled={isCurrentAgent}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors group ${
                          isCurrentAgent
                            ? 'bg-blue-50/70 dark:bg-blue-500/10 cursor-default'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                        }`}
                      >
                        {/* Avatar (Image 1 style with initials) */}
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                            isCurrentAgent ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                          }`}
                        >
                          {getInitials(agent.name)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isCurrentAgent
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                              }`}
                            >
                              {agent.name}
                            </p>
                            {isCurrentAgent && (
                              <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-1.5 py-0.2 rounded-full">
                                Current
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 flex-wrap mt-0.5">
                            <span className="capitalize">{agent.user_type}</span>
                            {agent.department_name && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[90px]">
                                  {agent.department_name}
                                </span>
                              </>
                            )}
                            {agent.location_name && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-medium truncate max-w-[80px] flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {agent.location_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {isCurrentAgent && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </>
              )
            ) : (
              /* ── DEPARTMENTS TAB: Team, Role Queue & Individual Selection ── */
              filteredDepartments.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No departments configured</p>
                </div>
              ) : (
                <>
                  <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                    Select a Department, Role, or Member
                  </div>
                  {filteredDepartments.map((dept) => {
                    const deptAgents = deptAgentsMap.get(dept.id) || [];
                    const agentCount = deptAgents.length;
                    const roleCounts: Record<string, number> = {
                      agent: deptAgents.filter((a) => a.user_type === 'agent').length,
                      admin: deptAgents.filter((a) => a.user_type === 'admin').length,
                      staff: deptAgents.filter((a) => a.user_type === 'staff').length,
                    };
                    const distinctRoles = (['agent', 'admin', 'staff'] as const).filter(
                      (r) => roleCounts[r] > 0
                    );
                    const isCurrentDept =
                      isDepartment && (agentName?.startsWith(dept.name) ?? false);
                    const hasAgents = agentCount > 0;

                    return (
                      <div
                        key={dept.id}
                        className={`p-3 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${
                          isCurrentDept
                            ? 'bg-sky-50/60 dark:bg-sky-950/20'
                            : hasAgents
                            ? 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
                            : 'opacity-60'
                        }`}
                      >
                        {/* Department Header Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isCurrentDept
                                  ? 'bg-sky-500 text-white'
                                  : hasAgents
                                  ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              <Building2 className="h-3.5 w-3.5" />
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {dept.name}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                                ({agentCount} {agentCount === 1 ? 'member' : 'members'})
                              </span>
                              {isCurrentDept && (
                                <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-1.5 py-0.2 rounded-full shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Primary Action: Assign Entire Department Button */}
                          {isCurrentDept ? (
                            <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 shrink-0 text-xs font-semibold">
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            </div>
                          ) : hasAgents ? (
                            <button
                              type="button"
                              onClick={() => handleAssignDepartment(dept.id, dept.name, null)}
                              title={`Assign entire ${dept.name} department (${agentCount} members)`}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <Users className="h-3 w-3" />
                              <span>Assign All ({agentCount})</span>
                            </button>
                          ) : null}
                        </div>

                        {/* If department has agents: Role queues & Select individual member */}
                        {hasAgents && (
                          <div className="mt-2.5 pl-9 space-y-2.5">
                            {/* Role Queue Assign Buttons */}
                            {distinctRoles.length > 0 && (
                              <div>
                                <p className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                  Assign by role queue:
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {distinctRoles.map((r) => {
                                    const count = roleCounts[r];
                                    const rTitle = r.charAt(0).toUpperCase() + r.slice(1);
                                    return (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() =>
                                          handleAssignDepartment(dept.id, dept.name, [r])
                                        }
                                        title={`Assign conversation to all ${count} ${rTitle}s in ${dept.name}`}
                                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border bg-slate-50 hover:bg-sky-600 hover:text-white dark:bg-slate-800 dark:hover:bg-sky-600 text-slate-700 hover:border-sky-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs active:scale-95 group"
                                      >
                                        <Shield className="h-3 w-3 text-sky-500 group-hover:text-white transition-colors" />
                                        <span>
                                          Assign all {rTitle}s ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Direct Member Selection within this Department */}
                            <div>
                              <p className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                Or select a member:
                              </p>
                              <div className="space-y-1 bg-white dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                {deptAgents.map((a) => {
                                  const isCurrent = a.id === conversation.assigned_agent;
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      disabled={isCurrent}
                                      onClick={() => handleAssignAgent(a.id, a.name)}
                                      className={`w-full flex items-center justify-between py-1 px-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                                        isCurrent
                                          ? 'bg-blue-50/80 dark:bg-blue-900/30 cursor-default'
                                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-700/60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                                            isCurrent
                                              ? 'bg-blue-500'
                                              : 'bg-slate-400 dark:bg-slate-600'
                                          }`}
                                        >
                                          {getInitials(a.name)}
                                        </div>
                                        <div className="min-w-0">
                                          <p
                                            className={`text-[11px] font-semibold truncate ${
                                              isCurrent
                                                ? 'text-blue-700 dark:text-blue-300'
                                                : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900'
                                            }`}
                                          >
                                            {a.name}
                                          </p>
                                          <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                            <span className="capitalize">{a.user_type}</span>
                                            {a.location_name && (
                                              <>
                                                <span>•</span>
                                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5 truncate max-w-[80px]">
                                                  <MapPin className="h-2 w-2 shrink-0" />
                                                  {a.location_name}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="shrink-0 ml-2">
                                        {isCurrent ? (
                                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                                            <Check className="h-3 w-3" />
                                            <span>Current</span>
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all bg-slate-100 group-hover:bg-sky-600 group-hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-sky-600 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                            Assign
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Empty department notice */}
                        {!hasAgents && (
                          <div className="mt-1 pl-9">
                            <span className="text-[10.5px] italic text-slate-400">
                              0 members in this department
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignAgentDropdown;
