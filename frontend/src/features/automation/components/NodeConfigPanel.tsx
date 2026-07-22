import React, { useState } from "react";
import { Plus } from "lucide-react";
interface NodeConfigPanelProps {
  onAddNode: (node: { type: string; data: { title: string; description: string } }) => void;
}

export function NodeConfigPanel({ onAddNode }: NodeConfigPanelProps) {
  const [newNodeType, setNewNodeType] = useState<"action" | "condition">("action");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeDesc, setNewNodeDesc] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeTitle.trim()) return;

    onAddNode({
      type: newNodeType,
      data: {
        title: newNodeTitle,
        description: newNodeDesc || "Custom node action"
      }
    });
    setNewNodeTitle("");
    setNewNodeDesc("");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit shadow-sm transition duration-200">
      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Add Logic Node</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-550 font-extrabold uppercase tracking-wider block mb-1">Node Type</label>
          <select
            value={newNodeType}
            onChange={(e) => setNewNodeType(e.target.value as "action" | "condition")}
            className="w-full bg-slate-55 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-205 focus:outline-none"
          >
            <option value="action">Action (Send Message / API Hook)</option>
            <option value="condition">Condition (If/Else Branch)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-550 font-extrabold uppercase tracking-wider block mb-1">Node Title</label>
          <input
            type="text"
            value={newNodeTitle}
            onChange={(e) => setNewNodeTitle(e.target.value)}
            placeholder="e.g. Verify Stripe Subscription"
            className="w-full bg-slate-55 bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
            required
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-550 font-extrabold uppercase tracking-wider block mb-1">Description</label>
          <textarea
            value={newNodeDesc}
            onChange={(e) => setNewNodeDesc(e.target.value)}
            placeholder="Configure webhook details or conditional values here"
            rows={3}
            className="w-full bg-slate-55 bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-[#007e3a] hover:bg-[#00662f] text-xs font-bold rounded-lg shadow-md text-white transition flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Insert Logic Node</span>
        </button>
      </form>
    </div>
  );
}

export default NodeConfigPanel;
