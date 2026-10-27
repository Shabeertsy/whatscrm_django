import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserCheck, ChevronDown, X, Loader2, User2, UserX } from 'lucide-react';
import type { Conversation, AssignableAgent } from '../../../api/messaging';
import { messagingApi } from '../../../api/messaging';
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
  const [agents, setAgents] = useState<AssignableAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [fetched, setFetched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch agents once on first open
  const fetchAgents = useCallback(async () => {
    if (fetched) return;
    setIsLoading(true);
    try {
      const res = await messagingApi.listAssignableAgents();
      setAgents(res.data);
      setFetched(true);
    } catch (err) {
      console.error('Failed to load agents:', err);
      showToast('Error', 'Could not load agents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fetched]);

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchAgents();
  };

  const handleAssign = async (agentId: string | null, agentName?: string) => {
    if (isAssigning) return;
    setIsAssigning(true);
    setIsOpen(false);

    // Optimistic update
    const prev = { assigned_agent: conversation.assigned_agent, agent_name: conversation.agent_name };
    messagingStore.updateConversationMeta(conversation.id, {
      assigned_agent: agentId,
      agent_name: agentName ?? null,
    });

    try {
      await messagingApi.updateConversation(conversation.id, { assigned_agent: agentId });
      if (agentId) {
        showToast('Assigned', `Conversation assigned to ${agentName}`, 'success');
      } else {
        showToast('Unassigned', 'Assignment removed', 'success');
      }
    } catch (err: any) {
      // Revert optimistic update
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

  const isAssigned = !!conversation.assigned_agent;
  const agentName = conversation.agent_name;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={handleToggleOpen}
        disabled={isAssigning}
        title={isAssigned ? `Assigned to ${agentName} — click to change` : 'Assign to an agent'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 border
          ${isAssigned
            ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          } ${isAssigning ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isAssigning ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isAssigned ? (
          <div className="h-4 w-4 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white text-[8px] font-black flex-shrink-0">
            {getInitials(agentName || '?')}
          </div>
        ) : (
          <UserCheck className="h-3 w-3" />
        )}
        <span className="max-w-[90px] truncate">
          {isAssigned ? agentName : 'Assign Agent'}
        </span>
        {!isAssigning && <ChevronDown className={`h-2.5 w-2.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assign to Agent</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading agents...</span>
              </div>
            ) : agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-3 text-center gap-1">
                <User2 className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                <span className="text-xs text-slate-400 dark:text-slate-500">No agents available</span>
                <span className="text-[10px] text-slate-300 dark:text-slate-600">Add agents with matching location</span>
              </div>
            ) : (
              <>
                {/* Unassign option — shown only when assigned */}
                {isAssigned && (
                  <button
                    onClick={() => handleAssign(null)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group border-b border-slate-100 dark:border-slate-800"
                  >
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <UserX className="h-3 w-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 font-medium transition-colors">
                      Unassign
                    </span>
                  </button>
                )}

                {/* Agent list */}
                {agents.map((agent) => {
                  const isCurrentAgent = agent.id === conversation.assigned_agent;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleAssign(agent.id, agent.name)}
                      disabled={isCurrentAgent}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                        ${isCurrentAgent
                          ? 'bg-blue-50 dark:bg-blue-500/10 cursor-default'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                        }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0
                          ${isCurrentAgent ? 'bg-blue-500 dark:bg-blue-400' : 'bg-slate-400 dark:bg-slate-600'}`}
                      >
                        {getInitials(agent.name)}
                      </div>
                      {/* Name + role */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isCurrentAgent ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {agent.name}
                          {isCurrentAgent && <span className="ml-1 text-[9px] font-normal opacity-70">(current)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate capitalize">{agent.user_type}</p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
