import React from "react";
import StageColumn from "./StageColumn";
import { Deal } from "./api";

interface KanbanBoardProps {
  stages: { id: string; title: string }[];
  deals: Deal[];
  onMoveDeal: (id: string, nextStage: string) => void;
  onEditDeal: (deal: Deal) => void;
}

export function KanbanBoard({ stages, deals, onMoveDeal, onEditDeal }: KanbanBoardProps) {
  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {stages.map((col) => (
        <StageColumn
          key={col.id}
          title={col.title}
          stage={col.id}
          deals={deals}
          onMoveDeal={onMoveDeal}
          onEditDeal={onEditDeal}
          stages={stages}
        />
      ))}
    </div>
  );
}

export default KanbanBoard;
