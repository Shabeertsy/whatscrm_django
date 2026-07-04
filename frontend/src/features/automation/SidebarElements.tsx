import React from "react";
import { MessageSquare, Image, Menu, SplitSquareHorizontal, Clock, XCircle, FileInput, Save, Sparkles, Globe } from "lucide-react";

export function SidebarElements() {
  const onDragStart = (event: React.DragEvent, nodeType: string, title: string, desc: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/reactflow-title", title);
    event.dataTransfer.setData("application/reactflow-desc", desc);
    event.dataTransfer.effectAllowed = "move";
  };

  const categories = [
    {
      title: "Messages",
      items: [
        { type: "action", label: "Send Message", icon: MessageSquare, color: "text-emerald-500", desc: "Send a text message to user" },
        { type: "action", label: "Send Media", icon: Image, color: "text-pink-500", desc: "Send image, video, or document" },
        { type: "action", label: "Menu Options", icon: Menu, color: "text-orange-500", desc: "Interactive button menu" },
      ]
    },
    {
      title: "Logic & Flow",
      items: [
        { type: "condition", label: "Condition Split", icon: SplitSquareHorizontal, color: "text-amber-500", desc: "Branch flow based on data" },
        { type: "trigger", label: "Delay", icon: Clock, color: "text-blue-500", desc: "Wait for a specified time" },
        { type: "action", label: "End Chat", icon: XCircle, color: "text-rose-500", desc: "Close the active conversation" },
      ]
    },
    {
      title: "Data & Actions",
      items: [
        { type: "action", label: "Collect Input", icon: FileInput, color: "text-purple-500", desc: "Ask for and save user input" },
        { type: "action", label: "Save Contact", icon: Save, color: "text-emerald-400", desc: "Update CRM contact details" },
        { type: "action", label: "AI Control", icon: Sparkles, color: "text-indigo-400", desc: "Handover to AI Agent" },
        { type: "action", label: "HTTP Request", icon: Globe, color: "text-orange-400", desc: "Trigger external webhook" },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto custom-scrollbar transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Components</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drag and drop to the canvas</p>
      </div>

      <div className="p-3 space-y-6">
        {categories.map((cat, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cat.title}</span>
            </div>
            <div className="space-y-2">
              {cat.items.map((item, j) => (
                <div
                  key={j}
                  onDragStart={(event) => onDragStart(event, item.type, item.label, item.desc)}
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
        ))}
      </div>
    </aside>
  );
}

export default SidebarElements;
