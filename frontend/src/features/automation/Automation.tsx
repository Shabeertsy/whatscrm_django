import React, { useState, useCallback } from "react";
import { useNodesState, useEdgesState, addEdge, Connection, Node, ReactFlowProvider } from "@xyflow/react";
import PageHeader from "../../components/shared/PageHeader";
import FlowCanvas from "./components/FlowCanvas";
import SidebarElements from "./components/SidebarElements";
import PropertiesPanel from "./components/PropertiesPanel";
import { Flow } from "./api";
import { automationApi } from "../../api/automation";
import { Plus, ArrowLeft, Workflow, Trash2, Save, Play, Pause, Edit2 } from "lucide-react";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { showToast } from "../../utils/toast";

export function Automation() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editFlowId, setEditFlowId] = useState<string | null>(null);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");

  const activeFlow = flows.find((f) => f.id === activeFlowId);

  const [nodes, setNodes, onNodesChange] = useNodesState(activeFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeFlow?.edges || []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Load flows on mount
  React.useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const data = await automationApi.getFlows();
      setFlows(data);
    } catch (err) {
      showToast("Error", "Failed to load automation flows", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Update flow nodes/edges locally whenever they change so we don't lose state
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

  const handleOpenEditModal = (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFlowId(flow.id);
    setNewFlowName(flow.name);
    setNewFlowDescription(flow.description || "");
    setIsCreateModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setNewFlowName("");
    setNewFlowDescription("");
    setEditFlowId(null);
  };

  const handleSubmitFlow = async () => {
    if (!newFlowName.trim()) {
      showToast("Error", "Flow name is required", "error");
      return;
    }
    try {
      if (editFlowId) {
        await automationApi.updateFlow(editFlowId, {
          name: newFlowName,
          description: newFlowDescription,
        });
        setFlows(prev => prev.map(f => f.id === editFlowId ? { ...f, name: newFlowName, description: newFlowDescription } : f));
        showToast("Flow Updated", "Flow updated successfully.", "success");
      } else {
        const newFlowData = {
          name: newFlowName,
          description: newFlowDescription,
        };
        const created = await automationApi.createFlow(newFlowData);
        setFlows([...flows, created]);
        handleFlowSelect(created.id);
        showToast("Flow Created", `"${created.name}" created successfully.`, "success");
      }
      closeModal();
    } catch (err) {
      showToast("Error", editFlowId ? "Failed to update flow." : "Failed to create flow.", "error");
    }
  };

  const handleDeleteFlow = async () => {
    if (!deleteFlowId) return;
    try {
      await automationApi.deleteFlow(deleteFlowId);
      setFlows((prev) => prev.filter((f) => f.id !== deleteFlowId));
      if (activeFlowId === deleteFlowId) {
        setActiveFlowId(null);
      }
      setDeleteFlowId(null);
      showToast("Flow Deleted", "Flow removed successfully.", "info");
    } catch (err) {
      showToast("Error", "Failed to delete flow.", "error");
    }
  };

  const handleSaveFlow = async () => {
    if (!activeFlowId) return;
    try {
      // Find the updated flow from state which has the latest nodes/edges
      const flowToSave = flows.find(f => f.id === activeFlowId);
      if (!flowToSave) return;

      await automationApi.updateFlow(activeFlowId, {
        name: flowToSave.name,
        nodes: flowToSave.nodes,
        edges: flowToSave.edges,
        viewport: flowToSave.viewport,
      });
      showToast("Saved", "Flow saved successfully.", "success");
    } catch (err) {
      showToast("Error", "Failed to save flow.", "error");
    }
  };

  const handleToggleFlowStatus = async (flowId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        const res = await automationApi.pauseFlow(flowId);
        showToast("Flow Paused", "Flow is now paused.", "info");
        setFlows(prev => prev.map(f => f.id === flowId ? { ...f, status: res.flow_status } : f));
      } else {
        const res = await automationApi.activateFlow(flowId);
        showToast("Flow Activated", "Flow is now active.", "success");
        setFlows(prev => prev.map(f => f.id === flowId ? { ...f, status: res.flow_status } : f));
      }
    } catch (err) {
      showToast("Error", "Failed to change flow status.", "error");
    }
  };

  const handleToggleActivate = async () => {
    if (!activeFlowId || !activeFlow) return;
    handleToggleFlowStatus(activeFlowId, activeFlow.status || 'draft');
  };

  const handleViewportChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    if (activeFlowId) {
      setFlows((prev) =>
        prev.map((f) => (f.id === activeFlowId ? { ...f, viewport } : f))
      );
    }
  }, [activeFlowId]);

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
    showToast("Node Deleted", "Canvas node removed.", "info");
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

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading flows...</div>;
  }

  if (!activeFlowId) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Automations & Flows"
            description="Manage and build your automated customer journeys."
          />
          <button
            onClick={() => {
              setEditFlowId(null);
              setNewFlowName("");
              setNewFlowDescription("");
              setIsCreateModalOpen(true);
            }}
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-[#007e3a] dark:hover:border-[#007e3a] cursor-pointer transition-all shadow-sm hover:shadow-md group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#007e3a]/10 text-[#007e3a] rounded-lg">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlowStatus(flow.id, flow.status || 'draft');
                    }}
                    className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${flow.status === 'active'
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60'
                      : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
                      }`}
                    title={flow.status === 'active' ? "Pause Flow" : "Activate Flow"}
                  >
                    {flow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => handleOpenEditModal(flow, e)}
                    className="p-1.5 text-slate-400 hover:text-[#007e3a] hover:bg-[#007e3a]/10 rounded-lg transition"
                    title="Edit Flow"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteFlowId(flow.id); }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                    title="Delete Flow Card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">{flow.name}</h3>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{flow.nodes?.length || 0} nodes configured</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${flow.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                  : flow.status === 'paused'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                  {flow.status || 'draft'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <ConfirmDialog
          isOpen={!!deleteFlowId}
          title="Delete Flow Card"
          description="Are you sure you want to delete this automation flow? All canvas nodes in this flow will be permanently removed."
          confirmLabel="Delete Flow"
          onConfirm={handleDeleteFlow}
          onCancel={() => setDeleteFlowId(null)}
        />

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-4">{editFlowId ? "Edit Flow" : "Create New Flow"}</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Flow Name *</label>
                  <input
                    type="text"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#007e3a] focus:border-transparent outline-none"
                    placeholder=""
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                  <textarea
                    value={newFlowDescription}
                    onChange={(e) => setNewFlowDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#007e3a] focus:border-transparent outline-none resize-none"
                    placeholder=""
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFlow}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-[#007e3a] hover:bg-[#00662f] shadow-sm shadow-[#007e3a]/20 transition-colors"
                >
                  {editFlowId ? "Save Changes" : "Create Flow"}
                </button>
              </div>
            </div>
          </div>
        )}
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
            title="Back to Flows"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{activeFlow?.name || "Flow Builder"}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${activeFlow?.status === 'active'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                : activeFlow?.status === 'paused'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                {activeFlow?.status || 'draft'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Design automated logical branches and templates.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveFlow}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1C2333] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-sm transition"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>

          <button
            onClick={handleToggleActivate}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm ${activeFlow?.status === 'active'
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-[#007e3a] hover:bg-[#00662f] text-white'
              }`}
          >
            {activeFlow?.status === 'active' ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Activate</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ReactFlowProvider>
          <SidebarElements />
          <FlowCanvas
            key={activeFlowId || 'empty'}
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            setNodes={setNodes}
            setSelectedNodeId={setSelectedNodeId}
            viewport={activeFlow?.viewport}
            onViewportChange={handleViewportChange}
          />
          <PropertiesPanel selectedNode={selectedNode} updateNodeData={updateNodeData} onDeleteNode={handleDeleteNode} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default Automation;
