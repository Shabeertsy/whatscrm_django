import React from "react";
import { LayoutDashboard, Building2 } from "lucide-react";
import { useRouter } from "../../router";

export function BottomBar() {
  const { path, navigate } = useRouter();

  const navItems = [
    { id: "/dashboard", label: "Home", icon: LayoutDashboard },
    { id: "/hotels", label: "Hotels", icon: Building2 },
    // Add more here if they fit
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-2 py-2 flex items-center justify-around pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = path === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition duration-200 ${
              isActive 
                ? "text-[#007e3a]" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <div className={`p-1.5 rounded-full ${isActive ? 'bg-[#007e3a]/10' : ''}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold mt-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomBar;
