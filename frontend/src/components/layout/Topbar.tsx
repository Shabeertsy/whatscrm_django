import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, Settings, LogOut, User } from "lucide-react";
import { useTeamStore } from "../../store/teamStore";
import { useNavigate } from "react-router-dom";
import { tokenService } from "../../api/token";
import { ActiveFlowsDropdown } from "./ActiveFlowsDropdown";



export function Topbar() {
  const [teamState] = useTeamStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    tokenService.clear();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between min-w-0 transition duration-200">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-xs md:w-80 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus-within:border-[#007e3a] transition duration-200">
        <Search className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent border-none text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <ActiveFlowsDropdown />

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-[#007e3a] rounded-full ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* Profile menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#007e3a] to-emerald-400 flex items-center justify-center font-extrabold text-white shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007e3a]/40 focus:ring-offset-2 transition"
          >
            S
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Account info */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Admin</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">admin@whatsacrm.com</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My Profile
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
