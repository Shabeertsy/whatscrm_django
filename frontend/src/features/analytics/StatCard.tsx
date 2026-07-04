import React from "react";
import { Radio, MessageSquare, GitFork, CreditCard } from "lucide-react";

const iconsMap: Record<string, any> = {
  "Active WhatsApp Instances": Radio,
  "Total Sent (Month)": MessageSquare,
  "Automation Success Rate": GitFork,
};

interface StatCardProps {
  label: string;
  val: string;
  desc: string;
}

export function StatCard({ label, val, desc }: StatCardProps) {
  const Icon = iconsMap[label] || MessageSquare;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-sm group transition duration-200">
      <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-[#007e3a]/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300"></div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[#007e3a] border border-slate-100 dark:border-slate-800">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">{val}</h3>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{desc}</p>
    </div>
  );
}

export default StatCard;
