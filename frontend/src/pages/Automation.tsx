import React, { useState, useCallback } from "react";
import { useNodesState, useEdgesState, addEdge, Connection, Node, ReactFlowProvider } from "@xyflow/react";
import PageHeader from "../components/shared/PageHeader";
import FlowCanvas from "../features/automation/FlowCanvas";
import SidebarElements from "../features/automation/SidebarElements";
import PropertiesPanel from "../features/automation/PropertiesPanel";
import { initialFlows, Flow } from "../features/automation/api";
import { Plus, ArrowLeft, Workflow, MoreVertical } from "lucide-react";

export function Automation() {
  const [flows, setFlows] = useState<Flow[]>(initialFlows);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const activeFlow = flows.find((f) => f.id === activeFlowId);

  const [nodes, setNodes, onNodesChange] = useNodesState(activeFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeFlow?.edges || []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Update flow nodes/edges whenever they change
  React.useEffect(() => {
    if (activeFlowId) {
      setFlows((prev) =>
        prev.map((f) => (f.id === activeFlowId ? { ...f, nodes, edges } : f))
      );
    }
  }, [nodes, edges, activeFlowId]);

  // Listen to node selection changes
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      const selectedChange = changes.find((c) => c.type === 'select');
      if (selectedChange) {
        if (selectedChange.selected) {
          setSelectedNodeId(selectedChange.id);
        } else if (selectedNodeId === selectedChange.id) {
          setSelectedNodeId(null);
        }
      }
    },
    [onNodesChange, selectedNodeId]
  );

  // Switch flow
  const handleFlowSelect = (id: string) => {
    const flow = flows.find((f) => f.id === id);
    if (flow) {
      setActiveFlowId(id);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setSelectedNodeId(null);
    }
  };

  const handleCreateFlow = () => {
    const newFlow: Flow = {
      id: `f_${Date.now()}`,
      name: `New Flow ${flows.length + 1}`,
      nodes: [],
      edges: [],
    };
    setFlows([...flows, newFlow]);
    handleFlowSelect(newFlow.id);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  };

  if (!activeFlowId) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Automations & Flows"
            description="Manage and build your automated customer journeys."
          />
          <button
            onClick={handleCreateFlow}
            className="flex items-center space-x-2 bg-[#007e3a] hover:bg-[#00662f] text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Flow</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {flows.map((flow) => (
            <div
              key={flow.id}
              onClick={() => handleFlowSelect(flow.id)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-[#007e3a] dark:hover:border-[#007e3a] cursor-pointer transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-[#007e3a]/10 text-[#007e3a] rounded-lg">
                  <Workflow className="h-5 w-5" />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); /* future options menu */ }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">{flow.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{flow.nodes.length} nodes configured</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mx-6 -my-6 sm:-mx-8 sm:-my-8 bg-slate-50 dark:bg-[#0B0F19] transition-colors">
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveFlowId(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-[#1C2333] text-slate-600 dark:text-slate-300 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{activeFlow?.name || "Flow Builder"}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Design automated logical branches and templates.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ReactFlowProvider>
          <SidebarElements />
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            setNodes={setNodes}
          />
          <PropertiesPanel selectedNode={selectedNode} updateNodeData={updateNodeData} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default Automation;
