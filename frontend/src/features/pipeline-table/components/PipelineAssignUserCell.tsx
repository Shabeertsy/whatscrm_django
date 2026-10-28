import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, UserPlus, UserX, Loader2, ShieldCheck, User } from 'lucide-react';
import type { AssignableAgent } from '../../../api/messaging';

interface PipelineAssignUserCellProps {
  dealId: string;
  assignedUser?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  agents: AssignableAgent[];
  onAssignUser?: (dealId: string, agentId: string | null) => void | Promise<void>;
}

// Curated avatar palettes for a bespoke, hand-crafted aesthetic
const AVATAR_PALETTES = [
  'bg-emerald-500 text-white dark:bg-emerald-600',
  'bg-blue-500 text-white dark:bg-blue-600',
  'bg-indigo-500 text-white dark:bg-indigo-600',
  'bg-violet-500 text-white dark:bg-violet-600',
  'bg-amber-500 text-white dark:bg-amber-600',
  'bg-teal-500 text-white dark:bg-teal-600',
  'bg-rose-500 text-white dark:bg-rose-600',
  'bg-cyan-500 text-white dark:bg-cyan-600',
];

function getAvatarColor(key: string = '') {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function PipelineAssignUserCell({
  dealId,
  assignedUser,
  agents = [],
  onAssignUser,
}: PipelineAssignUserCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

  // Calculate coordinates relative to viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 280; // approximate max height
    const placeAbove = window.innerHeight - rect.bottom < popoverHeight && rect.top > popoverHeight;

    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 276));
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

    setCoords({ top, left, placeAbove });
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setSearchQuery('');
      setIsOpen(true);
    }
  };

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredAgents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      a =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.user_type && a.user_type.toLowerCase().includes(q))
    );
  }, [agents, searchQuery]);

  const handleSelectAgent = async (agentId: string | null) => {
    if (isUpdating || !onAssignUser) return;
    setIsUpdating(true);
    setIsOpen(false);
    try {
      await onAssignUser(dealId, agentId);
    } finally {
      setIsUpdating(false);
    }
  };

  const isAssigned = !!assignedUser;
  const currentAgentId = assignedUser?.id;
  const assignedName = assignedUser?.name || assignedUser?.email || '';

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      {isAssigned ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={isUpdating}
          className={`group/agent inline-flex items-center justify-between gap-2 pl-1 pr-2 py-0.5 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-150 cursor-pointer min-w-[130px] max-w-[175px] select-none ${
            isOpen ? 'ring-2 ring-[#007e3a]/20 border-[#007e3a]/60 dark:border-[#007e3a]/60' : ''
          }`}
          title={`Assigned to ${assignedName} — click to reassign`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {isUpdating ? (
              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
              </div>
            ) : (
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs ring-1 ring-white/30 dark:ring-black/20 ${getAvatarColor(
                  currentAgentId || assignedName
                )}`}
              >
                {getInitials(assignedUser?.name, assignedUser?.email)}
              </div>
            )}
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              {assignedName}
            </span>
          </div>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 group-hover/agent:text-slate-600 dark:group-hover/agent:text-slate-300 transition-transform shrink-0 ml-1 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={isUpdating}
          className={`group/unassigned inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer select-none ${
            isOpen
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 ring-2 ring-[#007e3a]/20'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Click to assign team member"
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : (
            <div className="w-4 h-4 rounded-full border border-dashed border-slate-300 dark:border-slate-600 group-hover/unassigned:border-[#007e3a] dark:group-hover/unassigned:border-[#00b355] flex items-center justify-center text-slate-400 group-hover/unassigned:text-[#007e3a] dark:group-hover/unassigned:text-[#00b355] transition-colors shrink-0">
              <UserPlus className="w-2.5 h-2.5" />
            </div>
          )}
          <span className="text-xs font-medium">Assign</span>
        </button>
      )}

      {/* Popover Menu rendered in Portal to avoid table overflow clipping */}
      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? undefined : coords.top,
              bottom: coords.placeAbove ? window.innerHeight - coords.top : undefined,
              left: coords.left,
            }}
            className="w-64 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 z-[9999] overflow-hidden flex flex-col max-h-[320px] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <User className="w-3.5 h-3.5 text-[#007e3a] dark:text-[#00b355]" />
                <span className="text-xs font-semibold">Assign Team Member</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {agents.length} available
              </span>
            </div>

            {/* Search Input (shown when >= 3 agents) */}
            {agents.length >= 3 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name or email..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#007e3a] dark:focus:border-[#00b355] focus:ring-1 focus:ring-[#007e3a]/30 transition-all"
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {/* Unassign button (if currently assigned) */}
              {isAssigned && (
                <button
                  type="button"
                  onClick={() => handleSelectAgent(null)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors group/unassign"
                >
                  <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                    <UserX className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="truncate">Remove assignment</span>
                </button>
              )}

              {filteredAgents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {searchQuery ? 'No matching team members' : 'No team members found'}
                </div>
              ) : (
                filteredAgents.map(agent => {
                  const isSelected = String(agent.id) === String(currentAgentId);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleSelectAgent(agent.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#007e3a]/10 dark:bg-[#007e3a]/20 text-[#007e3a] dark:text-[#00b355]'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ring-1 ring-black/5 ${getAvatarColor(
                          agent.id || agent.name
                        )}`}
                      >
                        {getInitials(agent.name, agent.email)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected
                                ? 'text-[#007e3a] dark:text-[#00b355]'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {agent.name || agent.email}
                          </span>
                          {agent.user_type && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                              {agent.user_type}
                            </span>
                          )}
                        </div>
                        {agent.name && agent.email && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate block">
                            {agent.email}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[#007e3a] dark:text-[#00b355] shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default PipelineAssignUserCell;
