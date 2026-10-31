import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import { PipelineStage } from '../../pipeline/api';

interface PipelineStageSelectCellProps {
  dealId: string;
  stageId?: string;
  stages: PipelineStage[];
  onStageChange: (dealId: string, newStageId: string) => void | Promise<void>;
}

export function PipelineStageSelectCell({
  dealId,
  stageId,
  stages,
  onStageChange,
}: PipelineStageSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

  const currentStage = stages.find(s => String(s.id) === String(stageId));
  const stageColor = currentStage?.color || '#007e3a';
  const isConfirmed = Boolean(currentStage?.is_confirmed);

  // Calculate coordinates relative to viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = Math.min(320, 48 + stages.length * 40);
    const placeAbove = window.innerHeight - rect.bottom < popoverHeight && rect.top > popoverHeight;

    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 240));
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

    setCoords({ top, left, placeAbove });
  }, [stages.length]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleSelectStage = async (newStageId: string) => {
    if (String(newStageId) === String(stageId) || isUpdating) {
      setIsOpen(false);
      return;
    }
    setIsUpdating(true);
    setIsOpen(false);
    try {
      await onStageChange(dealId, newStageId);
    } finally {
      setIsUpdating(false);
    }
  };

  const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button: Bespoke Status Badge with uniform min-width */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={isUpdating}
        className={`group/stage inline-flex items-center justify-between gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer select-none min-w-[140px] max-w-[185px] border shadow-xs ${
          isConfirmed
            ? 'bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/80 shadow-emerald-500/5'
            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
        } ${isOpen ? 'ring-2 ring-[#007e3a]/25 border-[#007e3a]' : ''}`}
        title={`Current stage: ${currentStage?.title || 'Unknown'} — Click to change`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {isConfirmed ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <span
              className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
              style={{ backgroundColor: stageColor }}
            />
          )}
          <span className="truncate font-medium tracking-tight">
            {currentStage?.title || 'Select stage'}
          </span>
        </div>
        <ChevronDown
          className={`w-3 h-3 opacity-50 group-hover/stage:opacity-90 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown rendered in Portal */}
      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? undefined : coords.top,
              bottom: coords.placeAbove ? window.innerHeight - coords.top : undefined,
              left: coords.left,
            }}
            className="w-56 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 z-[9999] overflow-hidden flex flex-col max-h-[320px] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-[#007e3a] dark:text-[#00b355]" />
                <span className="text-xs font-semibold">Change Stage</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {stages.length} stages
              </span>
            </div>

            {/* Stage Options */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {sortedStages.map((stage, idx) => {
                const isSelected = String(stage.id) === String(stageId);
                const sColor = stage.color || '#007e3a';
                const sConfirmed = Boolean(stage.is_confirmed);

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleSelectStage(stage.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group/opt ${
                      isSelected
                        ? sConfirmed
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-[#007e3a]/10 dark:bg-[#007e3a]/20 text-[#007e3a] dark:text-[#00b355]'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {/* Color dot or check circle */}
                    {sConfirmed ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: sColor }}
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? sConfirmed
                                ? 'text-emerald-800 dark:text-emerald-300'
                                : 'text-[#007e3a] dark:text-[#00b355]'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {stage.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                        Step {idx + 1}
                      </span>
                    </div>

                    {isSelected && (
                      <Check
                        className={`w-4 h-4 shrink-0 ml-1 ${
                          sConfirmed
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#007e3a] dark:text-[#00b355]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default PipelineStageSelectCell;
