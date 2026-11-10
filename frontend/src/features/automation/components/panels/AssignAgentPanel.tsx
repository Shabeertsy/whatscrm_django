import React, { useEffect, useState, useMemo } from "react";
import { Loader2, UserCheck, Users, UsersRound, Check } from "lucide-react";
import toast from "react-hot-toast";
import { accountsApi, Department, User } from "../../../../api/accounts";
import { FieldGroup, FieldInput } from "../ui/FormFields";



// Types
// ────────────────────────────────────────────────────────

type AssignTo = "agent" | "department" | "department_role";
type AgentRole = "agent" | "admin" | "staff";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}


// Helpers
// ───────────────────────────────────────────────

const MODE_OPTIONS: { value: AssignTo; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: "agent",
    label: "Specific Agent",
    icon: <UserCheck className="w-4 h-4" />,
    desc: "Always assign to this exact agent",
  },
  {
    value: "department",
    label: "All in Department",
    icon: <Users className="w-4 h-4" />,
    desc: "All agents in the department can see & reply",
  },
  {
    value: "department_role",
    label: "Department + Role",
    icon: <UsersRound className="w-4 h-4" />,
    desc: "All agents with this role in the department",
  },
];

const ROLE_OPTIONS: { value: AgentRole; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
];

function getUserDisplayName(u: User): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || u.username || u.id;
}



// Panel
// ─────────────────────────────────────────────────────────────────

export function AssignAgentPanel({ nodeId, data, update }: Props) {
  const assignTo = (data.assign_to as AssignTo) ?? "agent";
  const agentId = (data.agent_id as string) ?? "";
  const departmentId = (data.department_id as string) ?? "";
  const selectedRoles: AgentRole[] = useMemo(() => {
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      return data.roles as AgentRole[];
    }
    if (data.role) {
      return [data.role as AgentRole];
    }
    return [];
  }, [data.roles, data.role]);

  const notifyMessage = (data.notify_message as string) ?? "";
  const setStatus = (data.set_status as string) ?? "open";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [deptAgents, setDeptAgents] = useState<User[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingDeptAgents, setLoadingDeptAgents] = useState(false);

  // Load departments once
  useEffect(() => {
    setLoadingDepts(true);
    accountsApi
      .listDepartments()
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
        setDepartments(rows);
      })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoadingDepts(false));
  }, []);

  // Load all agents (for "Specific Agent" mode)
  useEffect(() => {
    if (assignTo !== "agent") return;
    setLoadingAgents(true);
    accountsApi
      .listUsers({ user_type: undefined })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
        setAgents(rows.filter((u: User) => u.is_active));
      })
      .catch(() => toast.error("Failed to load agents"))
      .finally(() => setLoadingAgents(false));
  }, [assignTo]);

  // Load agents for the selected department
  useEffect(() => {
    if (!departmentId || assignTo === "agent") {
      setDeptAgents([]);
      return;
    }
    setLoadingDeptAgents(true);
    accountsApi
      .listUsers({ department: departmentId })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : (res.data as any).results ?? [];
        setDeptAgents(rows.filter((u: User) => u.is_active));
      })
      .catch(() => toast.error("Failed to load department agents"))
      .finally(() => setLoadingDeptAgents(false));
  }, [departmentId, assignTo]);

  // Compute eligible agents based on role selection
  const eligibleDeptAgents = useMemo(() => {
    if (assignTo === "department") return deptAgents;
    if (assignTo === "department_role") {
      if (selectedRoles.length === 0) return deptAgents;
      return deptAgents.filter((u) => selectedRoles.includes(u.user_type as AgentRole));
    }
    return [];
  }, [deptAgents, assignTo, selectedRoles]);

  // ── Patch helpers ──────────────────────────────────────────────────────────

  const patch = (fields: Record<string, unknown>) => update(nodeId, fields);

  const handleModeChange = (mode: AssignTo) => {
    patch({
      assign_to: mode,
      agent_id: "",
      agent_name: "",
      department_id: "",
      department_name: "",
      role: null,
      roles: [],
    });
  };

  const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const usr = agents.find((u) => u.id === id);
    patch({ agent_id: id, agent_name: usr ? getUserDisplayName(usr) : "" });
  };

  const handleDeptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const dept = departments.find((d) => d.id === id);
    patch({ department_id: id, department_name: dept?.name ?? "" });
  };

  const toggleRole = (r: AgentRole) => {
    let next: AgentRole[];
    if (selectedRoles.includes(r)) {
      next = selectedRoles.filter((x) => x !== r);
    } else {
      next = [...selectedRoles, r];
    }
    patch({
      roles: next,
      role: next.length > 0 ? next[0] : null,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  const selectCls =
    "w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 " +
    "rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white " +
    "focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs";

  return (
    <div className="space-y-5">

      {/* ── Mode selector ── */}
      <div>
        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
          Assign To
        </label>
        <div className="grid grid-cols-1 gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleModeChange(opt.value)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all text-xs font-semibold
                ${assignTo === opt.value
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-sm shadow-sky-500/10"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131924] text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-700"
                }`}
            >
              <span className={assignTo === opt.value ? "text-sky-500" : "text-slate-400"}>
                {opt.icon}
              </span>
              <div>
                <div className="font-bold">{opt.label}</div>
                <div className={`text-[10px] font-medium ${assignTo === opt.value ? "text-sky-500/80" : "text-slate-400"}`}>
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Specific Agent ── */}
      {assignTo === "agent" && (
        <FieldGroup label="Select Agent">
          {loadingAgents ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading agents…
            </div>
          ) : (
            <select value={agentId} onChange={handleAgentSelect} className={selectCls}>
              <option value="">— Select an agent —</option>
              {agents.map((u) => (
                <option key={u.id} value={u.id}>
                  {getUserDisplayName(u)} · {u.user_type}
                </option>
              ))}
            </select>
          )}
        </FieldGroup>
      )}

      {/* ── Department ── */}
      {(assignTo === "department" || assignTo === "department_role") && (
        <FieldGroup label="Select Department">
          {loadingDepts ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading departments…
            </div>
          ) : (
            <select value={departmentId} onChange={handleDeptSelect} className={selectCls}>
              <option value="">— Select a department —</option>
              {departments.filter((d) => d.is_active).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </FieldGroup>
      )}

      {/* ── Role (department_role mode) ── */}
      {assignTo === "department_role" && (
        <FieldGroup label="Filter by Role(s)">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {ROLE_OPTIONS.map((r) => {
                const isSelected = selectedRoles.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs"
                        : "bg-white dark:bg-[#131924] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "border-slate-300 dark:border-slate-600 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Select one or multiple roles. Leaving all unselected will assign to all roles in the department.
            </p>
          </div>
        </FieldGroup>
      )}

      {/* ── Live agent count preview ── */}
      {(assignTo === "department" || assignTo === "department_role") && departmentId && (
        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl p-3">
          {loadingDeptAgents ? (
            <div className="flex items-center gap-2 text-xs text-sky-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching eligible agents…
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-sky-700 dark:text-sky-300 font-semibold">
                {eligibleDeptAgents.length > 0 ? (
                  <span>
                    <strong>{eligibleDeptAgents.length} {eligibleDeptAgents.length === 1 ? 'member' : 'members'}</strong>{' '}
                    ({selectedRoles.length > 0 ? selectedRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ') : 'All roles'}) will receive and manage this chat.
                  </span>
                ) : (
                  "⚠️ No active agents match this filter — assignment will be skipped"
                )}
              </p>
              {eligibleDeptAgents.length > 0 && (
                <p className="text-[10px] text-sky-600/80 dark:text-sky-400/80">
                  Inbox will route incoming messages to all matching agents simultaneously.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Notify message ── */}
      <FieldGroup label="Notification Message (optional)">
        <FieldInput
          type="text"
          value={notifyMessage}
          onChange={(e) => patch({ notify_message: e.target.value })}
          placeholder="e.g. You've been connected to our support team."
          focus="focusGreen"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Sent to the contact after assignment. Leave blank to send nothing.
        </p>
      </FieldGroup>

      {/* ── Set conversation status ── */}
      <FieldGroup label="Set Conversation Status After Assign">
        <select
          value={setStatus}
          onChange={(e) => patch({ set_status: e.target.value })}
          className={selectCls}
        >
          <option value="">— No change —</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
        </select>
      </FieldGroup>

    </div>
  );
}

export default AssignAgentPanel;

