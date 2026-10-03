import React, { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SIDEBAR_CATEGORIES, SIDEBAR_ITEMS } from "../../../config/nodeRegistry";
import { ResizableSidebar } from "./ResizableSidebar";



export function SidebarElements() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, desc: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/reactflow-title", label);
    event.dataTransfer.setData("application/reactflow-desc", desc);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <ResizableSidebar 
      defaultWidth={256} 
      minWidth={200} 
      maxWidth={600} 
      position="left" 
      className="bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 flex flex-col"
      isCollapsed={isCollapsed}
      collapsedWidth={64}
    >
      {isCollapsed ? (
        <div className="flex flex-col h-full w-full">
          <div className="p-3 flex justify-center border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button 
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col p-2 space-y-4 py-4 items-center">
            {SIDEBAR_CATEGORIES.map((cat, index) => {
              const items = SIDEBAR_ITEMS[cat];
              if (!items?.length) return null;
              return (
                <div key={cat} className="space-y-3 w-full flex flex-col items-center">
                  {index > 0 && <div className="w-8 h-px bg-slate-200 dark:bg-slate-800"></div>}
                  {items.map((item) => (
                    <div
                      key={item.type + item.label}
                      onDragStart={(e) => onDragStart(e, item.type, item.label, item.description)}
                      draggable
                      title={item.label}
                      className="flex justify-center items-center w-10 h-10 bg-slate-50 dark:bg-[#131924] hover:bg-slate-100 dark:hover:bg-[#1C2333] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg cursor-grab transition-colors shadow-sm"
                    >
                      <div className={`p-1 rounded bg-white dark:bg-[#0B0F19] ${item.color}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Components</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drag and drop to the canvas</p>
            </div>
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
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
        </div>
      )}
    </ResizableSidebar>
  );
}

export default SidebarElements;
