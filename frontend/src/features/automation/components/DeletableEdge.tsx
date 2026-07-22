import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-5 h-5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center shadow-sm border border-slate-300 dark:border-slate-600 transition-colors"
            onClick={onEdgeClick}
            title="Delete Connection"
          >
            <X className="w-3 h-3 stroke-[3]" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default DeletableEdge;
