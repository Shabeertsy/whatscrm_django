import React from "react";

interface RoleSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-50 border border-slate-200 rounded text-xs p-1 text-slate-700 focus:outline-none"
    >
      <option value="Owner">Owner</option>
      <option value="Admin">Admin</option>
      <option value="Member">Member</option>
    </select>
  );
}

export default RoleSelector;
