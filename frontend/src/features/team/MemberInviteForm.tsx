import React, { useState } from "react";
import { Plus } from "lucide-react";

interface MemberInviteFormProps {
  onAdd: (email: string, role: string) => void;
}

export function MemberInviteForm({ onAdd }: MemberInviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onAdd(email, role);
    setEmail("");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition duration-200">
      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Invite Workspace Member</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-808 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
            required
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">System Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="Member">Member (Read/Write)</option>
            <option value="Admin">Admin (Full access except billing)</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-[#007e3a] hover:bg-[#00662f] text-xs font-bold rounded-lg shadow-md text-white transition flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Send Invitation</span>
        </button>
      </form>
    </div>
  );
}

export default MemberInviteForm;
