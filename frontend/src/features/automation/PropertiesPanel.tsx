import React from "react";
import { Node } from "@xyflow/react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  updateNodeData: (id: string, data: any) => void;
}

export function PropertiesPanel({ selectedNode, updateNodeData }: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full justify-center items-center p-6 text-center transition-colors">
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a node to edit.</p>
      </aside>
    );
  }

  const { data } = selectedNode;

  return (
    <aside className="w-80 bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Node Properties</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure {(data.title as string) || "this node"}</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Title</label>
          <input
            type="text"
            value={data.title as string || ""}
            onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
            className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Description</label>
          <textarea
            value={data.description as string || ""}
            onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
            rows={4}
            className="w-full bg-slate-50 dark:bg-[#131924] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007e3a] transition-colors resize-none"
          />
        </div>
      </div>
    </aside>
  );
}

export default PropertiesPanel;
