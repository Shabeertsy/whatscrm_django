import React, { useEffect, useState, useRef } from 'react';
import { Workflow, PlayCircle, Clock, Loader2, StopCircle } from 'lucide-react';
import { messagingApi, FlowExecution } from '../../api/messaging';
import { showToast } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../shared/ConfirmDialog';

export function ActiveFlowsDropdown() {
  const [open, setOpen] = useState(false);
  const [flows, setFlows] = useState<FlowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ executionId: string, flowName: string, contactName: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch on mount and poll periodically
  useEffect(() => {
    fetchFlows(false);
    const interval = setInterval(() => {
      fetchFlows(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);


  const fetchFlows = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await messagingApi.getActiveFlows();
      setFlows(res.data);
    } catch (error) {
      console.error('Failed to fetch global active flows:', error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const handleStopFlowClick = (e: React.MouseEvent, executionId: string, flowName: string, contactName: string) => {
    e.stopPropagation();
    setConfirmDialog({ executionId, flowName, contactName });
  };

  const handleConfirmStop = async () => {
    if (!confirmDialog) return;
    const { executionId, flowName } = confirmDialog;
    
    setStoppingId(executionId);
    try {
      await messagingApi.cancelFlow(executionId);
      showToast('Flow Stopped', `Successfully stopped "${flowName}".`, 'success');
      fetchFlows(false);
    } catch (error) {
      console.error('Failed to stop flow:', error);
      showToast('Error', 'Failed to stop flow. It may have already finished.', 'error');
    } finally {
      setStoppingId(null);
      setConfirmDialog(null);
    }
  };

  const navigateToConversation = (convId: string | null) => {
    if (convId) {
      navigate(`/inbox?conversationId=${convId}`);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchFlows(true); // fetch immediately when opening
        }}
        className="relative p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition"
        title="Active Automations"
      >
        <Workflow className="h-5 w-5" />
        {flows.length > 0 && (
          <span className="absolute top-0 -right-1 h-4 min-w-[16px] px-1 bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900">
            {flows.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 flex flex-col max-h-[400px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Workflow className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Active Automations
            </h3>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>

          <div className="overflow-y-auto flex-1 p-2">
            {!isLoading && flows.length === 0 && (
              <div className="py-6 px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                No active automation flows are running right now.
              </div>
            )}

            {flows.map(flow => (
              <div
                key={flow.id}
                onClick={() => navigateToConversation(flow.conversation_id)}
                className={`p-3 rounded-lg border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${flow.conversation_id ? 'cursor-pointer hover:border-slate-200 dark:hover:border-slate-700' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {flow.contact_name || flow.contact_phone || 'Unknown Contact'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                      {flow.status === 'running' ? (
                        <PlayCircle className="w-3 h-3 text-emerald-500 animate-pulse" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-500" />
                      )}
                      {flow.flow_name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate uppercase tracking-wider font-semibold">
                      Step: {flow.current_node_title || 'Processing'}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleStopFlowClick(e, flow.id, flow.flow_name, flow.contact_name || flow.contact_phone)}
                    disabled={stoppingId === flow.id}
                    className="flex-shrink-0 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-900/50 rounded border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[60px] gap-1"
                    title="Stop flow"
                  >
                    {stoppingId === flow.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                    ) : (
                      <>
                        <StopCircle className="w-3.5 h-3.5" />
                        Stop
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title="Stop Flow"
        description={confirmDialog ? `Are you sure you want to stop the automation flow "${confirmDialog.flowName}" for ${confirmDialog.contactName}?` : ''}
        confirmLabel="Stop Flow"
        cancelLabel="Cancel"
        onConfirm={handleConfirmStop}
        onCancel={() => setConfirmDialog(null)}
        isLoading={!!stoppingId}
      />
    </div>
  );
}
