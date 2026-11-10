import React from "react";
import { UserCheck } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

interface AssignAgentNodeProps {
  data: {
    title?: string;
    assign_to?: "agent" | "department" | "department_role";
    agent_name?: string;
    department_name?: string;
    role?: string | null;
    roles?: string[];
    notify_message?: string;
  };
  selected?: boolean;
}

const ASSIGN_LABELS: Record<string, string> = {
  agent:           "Specific Agent",
  department:      "All in Department",
  department_role: "Department Role(s)",
};

const ROLE_LABELS: Record<string, string> = {
  agent: "Agent",
  admin: "Admin",
  staff: "Staff",
};

export function AssignAgentNode({ data, selected }: AssignAgentNodeProps) {
  const assignTo    = data.assign_to ?? "agent";
  const modeLabel   = ASSIGN_LABELS[assignTo] ?? assignTo;
  const agentName   = data.agent_name?.trim();
  const deptName    = data.department_name?.trim();

  // Multi-roles support
  const roles = (data.roles && data.roles.length > 0)
    ? data.roles
    : (data.role ? [data.role] : []);
  const rolesLabel = roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");

  let targetLine = "Not configured";
  if (assignTo === "agent" && agentName) targetLine = agentName;
  if (assignTo === "department" && deptName) targetLine = `${deptName} (All)`;
  if (assignTo === "department_role" && deptName) {
    targetLine = rolesLabel ? `${deptName} · ${rolesLabel}` : `${deptName} (All roles)`;
  }

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={80}
        lineStyle={{ border: "1.5px dashed #0ea5e9" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #0284c7",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-sky-500 dark:border-sky-400 shadow-lg shadow-sky-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        {/* Header */}
        <div className="bg-sky-50 dark:bg-sky-950/40 px-3 py-2 border-b border-sky-100 dark:border-sky-900/40 flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
            Assign Chat
          </span>
        </div>

        {/* Body */}
        <div className="p-2.5 space-y-1.5">
          <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
            {data.title || "Assign Chat to Agent"}
          </h4>

          <div className="bg-slate-50 dark:bg-[#1C2333] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Mode:</span>
              <span className="font-semibold text-sky-600 dark:text-sky-400">{modeLabel}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 font-medium">Target:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                {targetLine}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!bg-sky-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-sky-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]"
      />
    </div>
  );
}

export default AssignAgentNode;

