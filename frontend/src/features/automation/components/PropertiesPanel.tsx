import React, { useRef } from "react";
import { Node } from "@xyflow/react";
import { Trash2, Upload, Image as ImageIcon, Film, FileText, X } from "lucide-react";

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
  if (type === "action") return SendMessagePanel;

  return null;
}



// ─────────────────────────────────────────────────────────────────────────────
// Media upload section 
// ─────────────────────────────────────────────────────────────────────────────
interface MediaSectionProps {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
  fileRef: React.RefObject<HTMLInputElement>;
}

function MediaSection({ nodeId, data, update, fileRef }: MediaSectionProps) {
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update(nodeId, {
        mediaUrl: ev.target?.result as string,
        mediaName: file.name,
        mediaType: file.type.startsWith("image/") ? "image"
          : file.type.startsWith("video/") ? "video"
            : "document",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    update(nodeId, { mediaUrl: null, mediaName: null, mediaType: null });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        Media Attachment
      </p>
      <input
        type="file"
        ref={fileRef}
        onChange={handleUpload}
        accept="image/*,video/*,application/pdf,audio/*"
        className="hidden"
      />

      {data.mediaUrl ? (
        <div className="bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              {data.mediaType === "image" && <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />}
              {data.mediaType === "video" && <Film className="h-4 w-4 text-blue-500 shrink-0" />}
              {data.mediaType === "document" && <FileText className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[170px]">
                {(data.mediaName as string) || "Uploaded Media"}
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 rounded-lg transition"
              title="Remove Media"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {data.mediaType === "image" && (
            <img src={data.mediaUrl as string} alt="Preview" className="h-32 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
          )}
          {data.mediaType === "video" && (
            <video src={data.mediaUrl as string} controls className="h-32 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
          )}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#007e3a] dark:hover:border-[#007e3a] rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50 dark:bg-[#131924] group"
        >
          <div className="w-10 h-10 rounded-full bg-[#007e3a]/10 text-[#007e3a] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Upload Media</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Image, Video, Audio or Document</p>
        </div>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// PropertiesPanel — thin shell: header + title + routed panel + delete footer
// ─────────────────────────────────────────────────────────────────────────────

export function PropertiesPanel({ selectedNode, updateNodeData, onDeleteNode }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full justify-center items-center p-6 text-center transition-colors">
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a node to edit.</p>
      </aside>
    );
  }


  const { data } = selectedNode;
  const nodeType = selectedNode.type ?? "action";
  const nodeTitle = (data.title as string) ?? "";
  const isMediaNode = nodeTitle.toLowerCase().includes("media") || !!data.mediaUrl;

  const Panel = resolvePanel(nodeType, nodeTitle);

  return (
    <aside className="w-80 bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full justify-between overflow-y-auto transition-colors">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Node Properties</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure {nodeTitle || "this node"}
          </p>
        </div>

        {/* Shared: Title */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Title
          </label>
          <input
            type="text"
            value={nodeTitle}
            onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
            className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-colors"
          />
        </div>

        {/* Node-specific panel */}
        {Panel && (
          <Panel
            nodeId={selectedNode.id}
            data={data as Record<string, unknown>}
            update={updateNodeData}
          />
        )}

        {/* Media upload (for media nodes) */}
        {isMediaNode && (
          <MediaSection
            nodeId={selectedNode.id}
            data={data as Record<string, unknown>}
            update={updateNodeData}
            fileRef={fileRef}
          />
        )}
      </div>

      {/* Footer: Delete */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onDeleteNode?.(selectedNode.id)}
          className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Node</span>
        </button>
      </div>
    </aside>
  );
}

export default PropertiesPanel;
