import React, { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  GitFork,
  Radio,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Settings,
  Sliders,
  Contact2,
  Bot,
  Building2,
  FileText,
  MessageSquareText,
  FolderOpen,
  Megaphone,
  Layers,
  CheckCircle,
  LayoutList,
} from "lucide-react";
import { useRouter } from "../../router";
import { useAuthStore } from "../../store/authStore";
import { getUserPermissions } from "../../utils/permissions";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permitted?: boolean;
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const { path, navigate } = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [authState] = useAuthStore();
  const permissions = getUserPermissions(authState?.user);

  const categories: NavCategory[] = [
    {
      title: "Main",
      items: [
        { id: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permitted: permissions.canAccessDashboard },
        { id: "/messaging", label: "Chats", icon: MessageSquare, permitted: permissions.canAccessChats },
      ],
    },
    {
      title: "Hotels & Bookings",
      items: [
        { id: "/hotels", label: "Hotels and Resorts", icon: Building2, permitted: permissions.canAccessHotels },
        { id: "/confirmed-bookings", label: "Confirmed Bookings", icon: CheckCircle, permitted: permissions.canAccessPipeline },
      ],
    },
    {
      title: "Sales & CRM",
      items: [
        { id: "/pipeline", label: "Pipeline", icon: Sliders, permitted: permissions.canAccessPipeline },
        { id: "/pipeline-table", label: "Pipeline Table", icon: LayoutList, permitted: permissions.canAccessPipeline },
        { id: "/contacts", label: "Contacts", icon: Contact2, permitted: permissions.canAccessContacts },
      ],
    },

    {
      title: "Marketing",
      items: [
        { id: "/campaigns", label: "Campaigns", icon: Megaphone, permitted: permissions.canAccessTemplates },
        { id: "/templates", label: "Templates", icon: FileText, permitted: permissions.canAccessTemplates },
        { id: "/custom-messages", label: "Custom Messages", icon: MessageSquareText, permitted: permissions.canAccessCustomMessages },
        { id: "/media", label: "Media Library", icon: FolderOpen, permitted: permissions.canAccessMedia },
      ],
    },
    {
      title: "Automation & AI",
      items: [
        { id: "/ai-agent", label: "AI Agent", icon: Bot, permitted: permissions.canAccessAiAgent },
        { id: "/automations", label: "Automations", icon: GitFork, permitted: permissions.canAccessAutomations },
        { id: "/flows", label: "WhatsApp Flows", icon: Layers, permitted: permissions.canAccessAutomations },
      ],
    },
    {
      title: "Team & Administration",
      items: [
        { id: "/users", label: "Users & Roles", icon: Users, permitted: permissions.canManageUsers },
      ],
    },
  ];

  // Filter only permitted items and exclude empty categories
  const filteredCategories = categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.permitted),
    }))
    .filter((category) => category.items.length > 0);

  const isItemActive = (itemId: string) => {
    if (path === itemId) return true;
    if (itemId === "/users" && path.startsWith("/users")) return true;
    if (itemId === "/campaigns" && path.startsWith("/campaigns/")) return true;
    if (itemId === "/hotels" && path.startsWith("/hotels/")) return true;
    return false;
  };

  return (
    <aside
      className={`${isCollapsed ? "w-18" : "w-60 lg:w-64"
        } bg-white dark:bg-[#08080b] border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between z-10 h-screen transition-all duration-300 relative select-none`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-slate-400 hover:text-[#007e3a] hover:scale-110 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 z-50 transition-all duration-200"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Top Logo Section */}
      <div className="h-20 shrink-0 border-b border-slate-100 dark:border-slate-800 flex items-center px-4">
        <div className="w-12 flex justify-center shrink-0">
          <div className="p-2 bg-[#007e3a] rounded-lg text-white shadow-md shadow-[#007e3a]/20">
            <Radio className="h-6 w-6" />
          </div>
        </div>
        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-44 opacity-100 ml-2"
            }`}
        >
          <h1 className="font-extrabold text-xl text-slate-900 dark:text-slate-100 tracking-tight">
            Click4Trip CRM
          </h1>
        </div>
      </div>

      {/* Scrollable Navigation Area with Category Headings */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {filteredCategories.map((cat, catIndex) => (
          <div key={cat.title} className="space-y-1">
            {/* Category Header */}
            {isCollapsed ? (
              catIndex > 0 && (
                <div className="my-2 border-t border-slate-100 dark:border-slate-800 mx-2" />
              )
            ) : (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] lg:text-[10.5px] xl:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {cat.title}
                </span>
              </div>
            )}

            {/* Category Nav Items */}
            <div className="space-y-1">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center py-2.5 rounded-lg text-sm lg:text-[13px] xl:text-[13.5px] font-medium transition-colors duration-200 group ${isActive
                      ? "bg-[#007e3a] text-white shadow-lg shadow-[#007e3a]/15 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    <div className="w-14 flex items-center justify-center shrink-0">
                      <Icon
                        className={`h-5 w-5 ${isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-[#007e3a] transition-colors"
                          }`}
                      />
                    </div>
                    <div
                      className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-36 lg:w-40 opacity-100"
                        }`}
                    >
                      {item.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Area */}
      <div className="h-16 shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center px-4">
        <div className="w-12 flex justify-center shrink-0">
          <span
            onClick={() => navigate("/settings")}
            className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Settings"
          >
            <Settings className="h-5 w-5 text-slate-400 hover:text-[#007e3a] transition-colors" />
          </span>
        </div>
        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 flex items-center text-xs lg:text-[11.5px] xl:text-[12px] text-slate-500 dark:text-slate-400 font-medium ${isCollapsed ? "w-0 opacity-0" : "w-36 lg:w-40 opacity-100 ml-2 gap-1.5"
            }`}
        >
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">
            {authState?.user?.first_name ||
              authState?.user?.username ||
              authState?.user?.email ||
              "User"}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
