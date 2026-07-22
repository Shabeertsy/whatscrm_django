import React, { useRef } from "react";
import { Node } from "@xyflow/react";
import { Trash2, Upload, Image as ImageIcon, Film, FileText, X, Plus } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  updateNodeData: (id: string, data: any) => void;
  onDeleteNode?: (id: string) => void;
}

export function PropertiesPanel({ selectedNode, updateNodeData, onDeleteNode }: PropertiesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full justify-center items-center p-6 text-center transition-colors">
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a node to edit.</p>
      </aside>
    );
  }

  const { data } = selectedNode;
  const isMediaNode = (data.title as string)?.toLowerCase().includes("media") || !!data.mediaUrl;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      updateNodeData(selectedNode.id, {
        mediaUrl: result,
        mediaName: file.name,
        mediaType: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "document",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    updateNodeData(selectedNode.id, {
      mediaUrl: null,
      mediaName: null,
      mediaType: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddCondition = () => {
    const conditions = Array.isArray(data.conditions) ? [...data.conditions] : [];
    conditions.push({ field: "message", operator: "equals", value: "" });
    updateNodeData(selectedNode.id, { conditions });
  };

  const handleUpdateCondition = (index: number, key: string, value: string) => {
    const conditions = Array.isArray(data.conditions) ? [...data.conditions] : [];
    conditions[index] = { ...conditions[index], [key]: value };
    updateNodeData(selectedNode.id, { conditions });
  };

  const handleRemoveCondition = (index: number) => {
    const conditions = Array.isArray(data.conditions) ? [...data.conditions] : [];
    conditions.splice(index, 1);
    updateNodeData(selectedNode.id, { conditions });
  };

  return (
    <aside className="w-80 bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full justify-between overflow-y-auto transition-colors">
      <div className="p-4 space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Node Properties</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure {(data.title as string) || "this node"}</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Title</label>
          <input
            type="text"
            value={(data.title as string) || ""}
            onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
            className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Description</label>
          <textarea
            value={(data.description as string) || ""}
            onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
            rows={3}
            className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-colors resize-none"
          />
        </div>

        {/* Media Upload Section for Media/Message Nodes */}
        {isMediaNode && (
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Media Attachment
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,application/pdf,audio/*"
              className="hidden"
            />

            {data.mediaUrl ? (
              <div className="relative bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col space-y-2">
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
                    onClick={handleRemoveMedia}
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
                onClick={() => fileInputRef.current?.click()}
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
        )}

        {/* Conditions Section for Condition Nodes */}
        {selectedNode.type === "condition" && (
          <div className="pt-2">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Conditions</label>
              <button onClick={handleAddCondition} className="text-[#007e3a] hover:bg-[#007e3a]/10 dark:hover:bg-[#007e3a]/20 p-1 rounded transition text-xs font-semibold flex items-center space-x-1">
                <Plus className="h-3 w-3"/>
                <span>Add</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {(Array.isArray(data.conditions) ? data.conditions : []).map((cond: any, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 relative group">
                  <button onClick={() => handleRemoveCondition(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove condition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex space-x-2 pr-6">
                    <select
                      value={cond.field || "message"}
                      onChange={(e) => handleUpdateCondition(idx, "field", e.target.value)}
                      className="w-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                    >
                      <option value="message">Message text</option>
                      <option value="user_tag">User Tag</option>
                      <option value="phone">Phone number</option>
                    </select>
                    <select
                      value={cond.operator || "equals"}
                      onChange={(e) => handleUpdateCondition(idx, "operator", e.target.value)}
                      className="w-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="starts_with">Starts with</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={cond.value || ""}
                    onChange={(e) => handleUpdateCondition(idx, "value", e.target.value)}
                    placeholder="Value..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a]"
                  />
                </div>
              ))}
              {(!Array.isArray(data.conditions) || data.conditions.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-2">No conditions added. Branch defaults to No.</p>
              )}
            </div>
          </div>
        )}
      </div>

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
