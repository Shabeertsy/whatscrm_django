import React from "react";
import { SIDEBAR_CATEGORIES, SIDEBAR_ITEMS } from "../config/nodeRegistry";

export function SidebarElements() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, desc: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/reactflow-title", label);
    event.dataTransfer.setData("application/reactflow-desc", desc);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto custom-scrollbar transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Components</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drag and drop to the canvas</p>
      </div>

      <div className="p-3 space-y-6">
        {SIDEBAR_CATEGORIES.map((cat) => {
          const items = SIDEBAR_ITEMS[cat];
          if (!items?.length) return null;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cat}</span>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.type + item.label}
                    onDragStart={(e) => onDragStart(e, item.type, item.label, item.description)}
                    draggable
                    className="flex items-center space-x-3 bg-slate-50 dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1C2333] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-2.5 cursor-grab transition-colors"
                  >
                    <div className={`p-1 rounded bg-white dark:bg-[#0B0F19] ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default SidebarElements;
