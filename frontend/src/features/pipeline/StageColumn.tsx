import React, { useState } from "react";
import { Deal } from "./api";

interface StageColumnProps {
  title: string;
  stage: string;
  deals: Deal[];
  onMoveDeal: (id: string, nextStage: string) => void;
  stages: { id: string; title: string }[];
}

export function StageColumn({ title, stage, deals, onMoveDeal, stages }: StageColumnProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const columnDeals = deals.filter((d) => d.stage === stage);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) {
      onMoveDeal(dealId, stage);
    }
    setIsDraggingOver(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[220px] rounded-xl p-4 flex flex-col h-[500px] transition duration-200 border ${
        isDraggingOver
          ? "bg-[#007e3a]/10 border-[#007e3a] border-dashed"
          : "bg-slate-50 dark:bg-slate-900/50 border-slate-205 border-slate-200 dark:border-slate-808"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-xs text-slate-808 text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</h4>
        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-655 text-slate-600 dark:text-slate-400 rounded-full font-bold text-[10px]">
          {columnDeals.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {columnDeals.map((deal) => (
          <div
            key={deal.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", deal.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm hover:border-[#007e3a] dark:hover:border-[#007e3a] active:scale-95 active:shadow-md cursor-grab active:cursor-grabbing transition duration-150"
          >
            <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{deal.name}</h5>
            <p className="text-[10px] text-slate-505 text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">{deal.phone}</p>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-[#007e3a] text-xs">${deal.value}</span>
              <select
                value={deal.stage}
                onChange={(e) => onMoveDeal(deal.id, e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold p-1 text-slate-600 dark:text-slate-300 focus:outline-none"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {columnDeals.length === 0 && (
          <div className="h-full flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 font-medium py-10">
            Drag deals here
          </div>
        )}
      </div>
    </div>
  );
}

export default StageColumn;
