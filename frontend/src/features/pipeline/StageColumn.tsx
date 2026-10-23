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
  stages, onUpdateStage, onDeleteStage, onMoveLeft, onMoveRight
}: StageColumnProps) {
  const stageObj = stages.find(s => String(s.id) === String(stage));
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editColor, setEditColor] = useState(stageObj?.color || "#e2e8f0");
  const [editIsConfirmed, setEditIsConfirmed] = useState(stageObj?.is_confirmed || false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dragCounter = useRef(0);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(title);
      setEditColor(stageObj?.color || "#e2e8f0");
      setEditIsConfirmed(stageObj?.is_confirmed || false);
    }
  }, [title, stageObj?.color, stageObj?.is_confirmed, isEditing]);

  const columnDeals = deals.filter((d) => String(d.stage) === String(stage));

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

  const handleSave = () => {
    const newTitle = editTitle.trim();
    const isTitleChanged = newTitle && newTitle !== title;
    const isColorChanged = editColor !== stageObj?.color;
    const isConfirmedChanged = editIsConfirmed !== (stageObj?.is_confirmed || false);

    if ((isTitleChanged || isColorChanged || isConfirmedChanged) && onUpdateStage) {
      onUpdateStage(stage, {
        ...(isTitleChanged ? { title: newTitle } : {}),
        ...(isColorChanged ? { color: editColor } : {}),
        ...(isConfirmedChanged ? { is_confirmed: editIsConfirmed } : {}),
      });
    } else {
      setEditTitle(title);
      setEditColor(stageObj?.color || "#e2e8f0");
      setEditIsConfirmed(stageObj?.is_confirmed || false);
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
      style={{ backgroundColor: !isDraggingOver && stageObj?.color ? `${stageObj.color}45` : undefined }}
      className={`flex-1 min-w-[300px] rounded-xl flex flex-col h-full transition-all duration-200 border ${isDraggingOver
        ? "bg-[#007e3a]/5 border-[#007e3a] border-dashed shadow-lg shadow-[#007e3a]/10"
        : "border-slate-200 dark:border-slate-800 shadow-sm"
        }`}
    >
      {/* ── Column Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200/60 dark:border-slate-800">

        {/* Title row / Edit Mode */}
        {isEditing ? (
          <div className="w-full space-y-2 pb-1">
            {/* Row 1: Color picker + Title input */}
            <div className="flex items-center gap-1.5 w-full">
              <div className="relative w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm hover:ring-[#007e3a] transition-all">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-0 p-0"
                  title="Stage Color"
                />
              </div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditTitle(title);
                    setEditColor(stageObj?.color || "#e2e8f0");
                    setEditIsConfirmed(stageObj?.is_confirmed || false);
                  }
                }}
                className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-[#007e3a] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-[#007e3a]/15"
                placeholder="Stage Title"
                autoFocus
              />
            </div>

            {/* Row 2: Confirmed stage toggle */}
            <div className="flex items-center w-full">
              <button
                type="button"
                onClick={() => setEditIsConfirmed(v => !v)}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all truncate ${
                  editIsConfirmed
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
                title="Toggle confirmed booking stage"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  editIsConfirmed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`} />
                <span className="truncate">{editIsConfirmed ? 'Confirmed Stage' : 'Not Confirmed Stage'}</span>
              </button>
            </div>

            {/* Row 3: Cancel and Save action buttons */}
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(title);
                  setEditColor(stageObj?.color || "#e2e8f0");
                  setEditIsConfirmed(stageObj?.is_confirmed || false);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-md shadow-sm transition-colors"
              >
                <Check className="h-3 w-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-0 group">
              {stageObj?.color && (
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer ring-2 ring-white dark:ring-slate-800 shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: stageObj.color }}
                  onClick={() => setIsEditing(true)}
                  title="Click to edit color or rename"
                />
              )}
              <h4
                onClick={() => setIsEditing(true)}
                className="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest truncate cursor-pointer group-hover:text-[#007e3a] dark:group-hover:text-[#00b355] transition-colors"
                title="Click to edit color or rename"
              >
                {title}
              </h4>
              {stageObj?.is_confirmed && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                  ✓ Confirmed
                </span>
              )}
            </div>

            <span className="flex-shrink-0 min-w-[1.75rem] text-center px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700">
              {columnDeals.length}
            </span>
          </div>
        )}

        {/* Controls row — always visible, subtle */}
        {!isEditing && (
          <div className="flex items-center justify-between">
            {/* Move arrows */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={onMoveLeft}
                disabled={!onMoveLeft}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${onMoveLeft
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
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${onMoveRight
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
              {deal.extra_data && Object.keys(deal.extra_data).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(deal.extra_data).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono truncate max-w-full">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-700 mt-auto">
              <span className="font-extrabold text-[#007e3a] text-sm tracking-wide">₹ {Number(deal.value).toLocaleString()}</span>
              {deal.is_confirmed_booking && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider">✓ Confirmed</span>
              )}
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


