import React from "react";
import { Node } from "@xyflow/react";
import { Trash2, Zap, GitBranch, Clock, MessageSquare, Sliders, Settings, Sparkles, MapPin } from "lucide-react";


import { TriggerPanel } from "./panels/TriggerPanel";
import { DelayPanel } from "./panels/DelayPanel";
import { ConditionPanel } from "./panels/ConditionPanel";
import { SendMessagePanel } from "./panels/SendMessagePanel";
import { EndChatPanel } from "./panels/EndChatPanel";
import { CollectInputPanel } from "./panels/CollectInputPanel";
import { SaveContactPanel } from "./panels/SaveContactPanel";
import { AiControlPanel } from "./panels/AiControlPanel";
import { HttpRequestPanel } from "./panels/HttpRequestPanel";
import { MenuOptionsPanel } from "./panels/MenuOptionsPanel";
import { SaveLocationPanel } from "./panels/SaveLocationPanel";




// Types
interface Props {
  selectedNode: Node | null;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode?: (id: string) => void;
}

type PanelProps = {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
};


// Panel router — maps node type → panel component
function resolvePanel(type: string, title: string): React.FC<PanelProps> | null {
  const t = title?.toLowerCase() ?? "";

  if (type === "trigger") return TriggerPanel;
  if (type === "wait" || type === "delay") return DelayPanel;
  if (type === "condition") return ConditionPanel;
  if (type === "menu" || t.includes("menu")) return MenuOptionsPanel;
  if (type === "end_chat" || type === "endChat" || t.includes("end chat")) return EndChatPanel;
  if (type === "collect_input" || type === "collectInput" || t.includes("collect input")) return CollectInputPanel;
  if (type === "save_contact" || type === "saveContact" || t.includes("save contact")) return SaveContactPanel;
  if (type === "ai_control" || type === "aiControl" || t.includes("ai control")) return AiControlPanel;
  if (type === "http_request" || type === "httpRequest" || t.includes("http request")) return HttpRequestPanel;
  if (type === "save_location" || type === "saveLocation" || t.includes("save location")) return SaveLocationPanel;
  if (type === "action") return SendMessagePanel;

  return null;
}

function getNodeStyle(type: string) {
  switch (type) {
    case "trigger":
      return { bg: "bg-amber-500", shadow: "shadow-amber-500/20", label: "Trigger Event", icon: Zap };
    case "condition":
      return { bg: "bg-amber-500", shadow: "shadow-amber-500/20", label: "Condition Split", icon: GitBranch };
    case "wait":
    case "delay":
      return { bg: "bg-blue-600", shadow: "shadow-blue-500/20", label: "Time Delay", icon: Clock };
    case "action":
      return { bg: "bg-emerald-600", shadow: "shadow-emerald-500/20", label: "Send Message", icon: MessageSquare };
    case "save_location":
      return { bg: "bg-rose-600", shadow: "shadow-rose-500/20", label: "Save Location", icon: MapPin };
    default:
      return { bg: "bg-slate-800 dark:bg-slate-700", shadow: "shadow-slate-500/20", label: "Action Node", icon: Sliders };
  }
}



// Media upload section 
// ─────────────────────────────────────────────────────────────────────────────
// PropertiesPanel — thin shell: header + title + routed panel + delete footer
// ─────────────────────────────────────────────────────────────────────────────

export function PropertiesPanel({ selectedNode, updateNodeData, onDeleteNode }: Props) {


  if (!selectedNode) {
    return (
      <aside className="w-96 md:w-[400px] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full justify-center items-center p-8 text-center transition-all shadow-2xl z-20">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner border border-slate-200/60 dark:border-slate-700/60">
          <Settings className="w-8 h-8 animate-spin-slow" />
        </div>
        <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-1">No Node Selected</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed font-medium">
          Click on any block in your workflow canvas to customize its properties and routing rules.
        </p>
      </aside>
    );
  }


  const { data } = selectedNode;
  const nodeType = selectedNode.type ?? "action";
  const nodeTitle = (data.title as string) ?? "";
  const isMediaNode = nodeTitle.toLowerCase().includes("media") || !!data.mediaUrl;

  const style = getNodeStyle(nodeType);
  const NodeIcon = style.icon;
  const Panel = resolvePanel(nodeType, nodeTitle);

  return (
    <aside className="w-96 md:w-[400px] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full justify-between overflow-y-auto transition-all shadow-2xl z-20">
      <div>
        {/* Node Header */}
        <div className="relative overflow-hidden bg-slate-50/80 dark:bg-slate-900/50 p-5 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-2xl ${style.bg} flex items-center justify-center text-white shadow-lg ${style.shadow} shrink-0 transform transition-transform hover:scale-105`}>
              <NodeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight truncate">
                {nodeTitle || style.label}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Title Input */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 shadow-2xs">
            <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Block Name
            </label>
            <input
              type="text"
              value={nodeTitle}
              onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
              placeholder="Enter block title..."
              className="w-full bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition-all shadow-2xs"
            />
          </div>

          {/* Node-specific panel */}
          {Panel && (
            <div className="pt-1">
              <Panel
                nodeId={selectedNode.id}
                data={data as Record<string, unknown>}
                update={updateNodeData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer: Delete */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 mt-auto">
        <button
          onClick={() => onDeleteNode?.(selectedNode.id)}
          className="w-full flex items-center justify-center space-x-2 bg-rose-50/80 hover:bg-rose-500 hover:text-white text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600 dark:hover:text-white dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/50 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-200 shadow-xs group"
        >
          <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span>Delete This Block</span>
        </button>
      </div>
    </aside>
  );
}

export default PropertiesPanel;
