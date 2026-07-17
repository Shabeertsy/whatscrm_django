import React, { useState } from "react";
import { Deal } from "./api";

interface StageColumnProps {
  title: string;
  stage: string;
  deals: Deal[];
  onMoveDeal: (id: string, nextStage: string) => void;
  onEditDeal: (deal: Deal) => void;
  stages: { id: string; title: string }[];
}

export function StageColumn({ title, stage, deals, onMoveDeal, onEditDeal, stages }: StageColumnProps) {
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
      className={`flex-1 min-w-[300px] rounded-xl p-3 flex flex-col h-[650px] transition duration-200 border ${
        isDraggingOver
          ? "bg-[#007e3a]/10 border-[#007e3a] border-dashed"
          : "bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</h4>
        <span className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700">
          {columnDeals.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2">
        {columnDeals.map((deal) => (
          <div
            key={deal.id}
            draggable
            onClick={() => onEditDeal(deal)}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", deal.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-md hover:border-[#007e3a] dark:hover:border-[#007e3a] active:scale-[0.98] active:shadow-sm cursor-pointer transition-all duration-200 flex flex-col min-h-[100px]"
          >
            <div className="flex-1 min-h-0 overflow-hidden mb-2">
              <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{deal.name}</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {deal.contact_name || deal.contact_phone || "No Contact Linked"}
              </p>
              {deal.note && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400/80 line-clamp-2 mt-2 italic bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-md leading-relaxed">
                  {deal.note}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-700 mt-auto">
              <span className="font-extrabold text-[#007e3a] text-sm tracking-wide">₹ {Number(deal.value).toLocaleString()}</span>
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
