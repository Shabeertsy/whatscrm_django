import React, { useMemo, useCallback, useRef } from "react";
import { ReactFlow, Controls, Background, BackgroundVariant, MiniMap, NodeChange, EdgeChange, Node, Edge, Connection, useReactFlow } from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import SendMessageNode from "./nodes/SendMessageNode";
import WaitNode from "./nodes/WaitNode";
import ConditionNode from "./nodes/ConditionNode";

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function FlowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(() => ({
    trigger: WaitNode,
    condition: ConditionNode,
    action: SendMessageNode,
  }), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const title = event.dataTransfer.getData('application/reactflow-title');
      const desc = event.dataTransfer.getData('application/reactflow-desc');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `n_${Date.now()}`,
        type,
        position,
        data: { title, description: desc },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="flex-1 h-full w-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
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
