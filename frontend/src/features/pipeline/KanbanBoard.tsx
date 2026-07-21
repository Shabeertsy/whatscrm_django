import React, { useRef, useState, useEffect } from "react";
import StageColumn from "./StageColumn";
import { Deal, PipelineStage } from "./api";


interface KanbanBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onMoveDeal: (id: string, nextStage: string) => void;
  onEditDeal: (deal: Deal) => void;
  onUpdateStage?: (id: string, data: Partial<PipelineStage>) => void;
  onSwapStages?: (stageAId: string, stageBId: string) => void;
  onDeleteStage?: (id: string) => void;
}


const SCROLL_ZONE = 120;  // px from edge to trigger drag-scroll
const SCROLL_SPEED = 10;  // px per frame



// Returns true if the element (or any ancestor) is interactive — so we don't
// hijack clicks on cards, buttons, inputs, etc.
function isInteractive(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return !!el.closest('button, input, a, textarea, select, [draggable="true"], [role="button"]');
}

export function KanbanBoard({ stages, deals, onMoveDeal, onEditDeal, onUpdateStage, onSwapStages, onDeleteStage }: KanbanBoardProps) {
  const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));

  const boardRef = useRef<HTMLDivElement>(null);



  // Drag-drop auto-scroll \
  const scrollRafRef = useRef<number | null>(null);

  const stopAutoScroll = () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  const startAutoScroll = (dir: 'left' | 'right') => {
    if (scrollRafRef.current !== null) return;
    const tick = () => {
      if (!boardRef.current) { stopAutoScroll(); return; }
      boardRef.current.scrollLeft += dir === 'right' ? SCROLL_SPEED : -SCROLL_SPEED;
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  };

  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX;
    if (x < rect.left + SCROLL_ZONE) { stopAutoScroll(); startAutoScroll('left'); }
    else if (x > rect.right - SCROLL_ZONE) { stopAutoScroll(); startAutoScroll('right'); }
    else stopAutoScroll();
  };

  // ── Click-drag to pan (grab scroll) ──────────────────────────────────────
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; scrollLeft: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan on primary button, and skip interactive elements
    if (e.button !== 0 || isInteractive(e.target)) return;
    if (!boardRef.current) return;
    panStart.current = { x: e.clientX, scrollLeft: boardRef.current.scrollLeft };
    setIsPanning(true);
  };

  useEffect(() => {
    if (!isPanning) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!panStart.current || !boardRef.current) return;
      const dx = e.clientX - panStart.current.x;
      // 4px threshold to avoid micro-pans from normal clicks
      if (Math.abs(dx) < 4) return;
      boardRef.current.scrollLeft = panStart.current.scrollLeft - dx;
    };

    const onMouseUp = () => {
      panStart.current = null;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning]);

  // ── Stage reorder ─────────────────────────────────────────────────────────
  const handleMoveStage = (index: number, direction: 'left' | 'right') => {
    if (!onSwapStages) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return;
    onSwapStages(sortedStages[index].id, sortedStages[targetIndex].id);
  };

  return (
    <div
      ref={boardRef}
      onDragOver={handleBoardDragOver}
      onDragEnd={stopAutoScroll}
      onDrop={stopAutoScroll}
      onMouseDown={handleMouseDown}
      className={`flex h-full space-x-4 overflow-x-auto pb-2 select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {sortedStages.map((col, index) => (
        <StageColumn
          key={col.id}
          title={col.title}
          stage={col.id}
          deals={deals}
          onMoveDeal={onMoveDeal}
          onEditDeal={onEditDeal}
          stages={sortedStages}
          onUpdateStage={onUpdateStage}
          onDeleteStage={onDeleteStage}
          onMoveLeft={index > 0 ? () => handleMoveStage(index, 'left') : undefined}
          onMoveRight={index < sortedStages.length - 1 ? () => handleMoveStage(index, 'right') : undefined}
        />
      ))}
    </div>
  );
}

export default KanbanBoard;


