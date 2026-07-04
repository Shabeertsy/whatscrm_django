import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomBar from "./BottomBar";

import { useTeamStore } from "../../store/teamStore";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [teamState] = useTeamStore();
  const theme = teamState.theme;

  return (
    <div className={`flex h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden w-full ${theme === "dark" ? "dark" : ""}`}>
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] dark:bg-slate-950 overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0 pb-24 md:pb-6">
          {children}
        </main>
        <BottomBar />
      </div>
    </div>
  );
}

export default DashboardLayout;
