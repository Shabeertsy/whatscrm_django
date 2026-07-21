import React, { useState, useRef, useEffect } from "react";
import { Deal, PipelineStage } from "./api";
import { Edit2, Check, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle } from "lucide-react";



interface StageColumnProps {
  title: string;
  stage: string;
  deals: Deal[];
  onMoveDeal: (id: string, nextStage: string) => void;
  onEditDeal: (deal: Deal) => void;
  stages: PipelineStage[];
  onUpdateStage?: (id: string, data: Partial<PipelineStage>) => void;
  onDeleteStage?: (id: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}


export function StageColumn({
  title, stage, deals, onMoveDeal, onEditDeal,
  onUpdateStage, onDeleteStage, onMoveLeft, onMoveRight
}: StageColumnProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dragCounter = useRef(0);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);


  
  const columnDeals = deals.filter((d) => d.stage === stage);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) onMoveDeal(dealId, stage);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== title && onUpdateStage) {
      onUpdateStage(stage, { title: editTitle.trim() });
    } else {
      setEditTitle(title);
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setConfirmDelete(false);
      onDeleteStage?.(stage);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[300px] rounded-xl flex flex-col h-full transition-all duration-200 border ${
        isDraggingOver
          ? "bg-[#007e3a]/5 border-[#007e3a] border-dashed shadow-lg shadow-[#007e3a]/10"
          : "bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
      }`}
    >
      {/* ── Column Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200/60 dark:border-slate-800">

        {/* Title row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') { setIsEditing(false); setEditTitle(title); }
                }}
                className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-[#007e3a]/50 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#007e3a] focus:ring-2 focus:ring-[#007e3a]/10"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="flex-shrink-0 p-1.5 bg-[#007e3a] text-white rounded-lg hover:bg-[#00662f] transition-colors"
                title="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditTitle(title); }}
                className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0 group">
              <h4
                onClick={() => setIsEditing(true)}
                className="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest truncate cursor-pointer group-hover:text-[#007e3a] dark:group-hover:text-[#00b355] transition-colors"
                title="Click to rename"
              >
                {title}
              </h4>
       
            </div>
          )}

          {!isEditing && (
            <span className="flex-shrink-0 min-w-[1.75rem] text-center px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700">
              {columnDeals.length}
            </span>
          )}
        </div>

        {/* Controls row — always visible, subtle */}
        {!isEditing && (
          <div className="flex items-center justify-between">
            {/* Move arrows */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={onMoveLeft}
                disabled={!onMoveLeft}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  onMoveLeft
                    ? "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-sm"
                    : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                }`}
                title="Move stage left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onMoveRight}
                disabled={!onMoveRight}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  onMoveRight
                    ? "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-sm"
                    : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                }`}
                title="Move stage right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Delete — two-step confirmation */}
            {onDeleteStage && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Delete stage?</span>
                  <button
                    onClick={handleDeleteClick}
                    className="text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded px-1.5 py-0.5 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Delete stage"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Deal Cards ── */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {columnDeals.map((deal) => (
          <div
            key={deal.id}
            draggable
            onClick={() => onEditDeal(deal)}
            onDragStart={(e) => {
              // Reset counter so the source column doesn't go negative when this card leaves
              dragCounter.current = 0;
              setIsDraggingOver(false);
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
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-slate-600 py-10">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <span className="text-base leading-none">+</span>
            </div>
            <span className="text-[11px] font-medium">Drag deals here</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StageColumn;


