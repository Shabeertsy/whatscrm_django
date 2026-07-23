import React, { useMemo, useCallback, useRef } from "react";
import {
  ReactFlow, Controls, Background, BackgroundVariant, MiniMap,
  NodeChange, EdgeChange, Node, Edge, Connection, useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NODE_TYPES, EDGE_TYPES, resolveNodeType, getInitialData, NODE_REGISTRY } from "../config/nodeRegistry";
import { showToast } from "../../../utils/toast";



interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setSelectedNodeId?: (id: string | null) => void;
}



// Component
// ──────────────────────────────────

export function FlowCanvas({
  nodes, edges,
  onNodesChange, onEdgesChange, onConnect, onNodeClick,
  setNodes, setSelectedNodeId,
}: FlowCanvasProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Memoised type maps — stable references, prevents ReactFlow re-renders
  const nodeTypes = useMemo(() => NODE_TYPES, []);
  const edgeTypes = useMemo(() => EDGE_TYPES, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const type = e.dataTransfer.getData("application/reactflow");
      const title = e.dataTransfer.getData("application/reactflow-title");
      const desc = e.dataTransfer.getData("application/reactflow-desc");

      if (!type) return;

      // Guard: only one trigger allowed per flow
      if (type === "trigger" && nodes.some((n) => n.type === "trigger")) {
        showToast("Trigger Limit", "Only one trigger node is allowed per flow.", "warning");
        return;
      }

      const resolvedType = resolveNodeType(type, title);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newId = `n_${Date.now()}`;

      const entry = NODE_REGISTRY[resolvedType];
      const newNode: Node = {
        id: newId,
        type: resolvedType,
        position,
        data: getInitialData(type, title, desc),
        selected: true,
        width:  entry?.defaultWidth  ?? 220,
        height: entry?.defaultHeight ?? 120,
      };

      setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), newNode]);
      setSelectedNodeId?.(newId);
    },
    [nodes, screenToFlowPosition, setNodes, setSelectedNodeId]
  );

  return (
    <div className="flex-1 h-full w-full relative" ref={wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "default" }}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        className="bg-slate-50 dark:bg-[#0B0F19] transition-colors"
      >
        <Background gap={16} variant={BackgroundVariant.Dots} className="dark:opacity-50" />
        <Controls className="bg-white dark:bg-[#131924] border-slate-200 dark:border-slate-800 fill-slate-700 dark:fill-white" />
        <MiniMap
          className="bg-white dark:bg-[#131924] border border-slate-200 dark:border-slate-800"
          maskColor="rgba(248, 250, 252, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}

export default FlowCanvas;
