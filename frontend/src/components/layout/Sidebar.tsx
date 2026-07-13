import React, { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  GitFork,
  Radio,
  Users,
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  Settings,
  Sliders,
  PhoneCall,
  Contact2,
  Bot,
  Building2,
  FileText
} from "lucide-react";
import { useRouter } from "../../router";
import { useTeamStore } from "../../store/teamStore";

export function Sidebar() {
  const { path, navigate } = useRouter();
  const [teamState, setTeamState] = useTeamStore();
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentTenant = teamState.currentTenant;
  const credits = teamState.credits;

  const navItems = [
    { id: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "/hotels", label: "Hotels and Resorts", icon: Building2 },
    { id: "/contacts", label: "Contacts", icon: Contact2 },
    // { id: "/pipeline", label: "Pipeline", icon: Sliders },
    { id: "/messaging", label: "Chats", icon: MessageSquare },
    // { id: "/ai-agent", label: "AI Agent", icon: Bot },
    // { id: "/automations", label: "Flow Builder", icon: GitFork },
    { id: "/templates", label: "Templates", icon: FileText },
    // { id: "/campaigns", label: "Campaigns & Templates", icon: Radio },
    // { id: "/voice", label: "Voice/Calls", icon: PhoneCall },
  ];

  return (
    <aside className={`${isCollapsed ? "w-20" : "w-64"} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between z-10 h-screen transition-all duration-300 relative`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-slate-400 hover:text-[#007e3a] hover:scale-110 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 z-50 transition-all duration-200"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div>
        {/* Logo */}
        <div className="h-20 border-b border-slate-100 dark:border-slate-800 flex items-center px-4">
          <div className="w-12 flex justify-center shrink-0">
            <div className="p-2 bg-[#007e3a] rounded-lg text-white shadow-md shadow-[#007e3a]/20">
              <Radio className="h-6 w-6" />
            </div>
          </div>
          <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-40 opacity-100 ml-2"}`}>
            <h1 className="font-extrabold text-xl text-slate-900 dark:text-slate-100 tracking-tight">
              WhatsApp CRM
            </h1>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 group ${
                  isActive
                    ? "bg-[#007e3a] text-white shadow-lg shadow-[#007e3a]/15"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="w-14 flex items-center justify-center shrink-0">
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#007e3a] transition-colors"}`} />
                </div>
                <div className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-32 opacity-100"}`}>
                  {item.label}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="h-16 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center px-4">
        <div className="w-12 flex justify-center shrink-0">
          <span onClick={() => navigate("/settings")} className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" title="Settings">
            <Settings className="h-5 w-5 text-slate-400" />
          </span>
        </div>
        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 flex items-center text-xs text-slate-500 dark:text-slate-400 font-semibold ${isCollapsed ? "w-0 opacity-0" : "w-32 opacity-100 ml-2 gap-1.5"}`}>
          <User className="h-3.5 w-3.5" /> Shabeer
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;
