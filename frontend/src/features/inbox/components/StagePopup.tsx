import React, { useEffect, useState, useRef } from 'react';
import { Conversation } from '../../../api/messaging';
import { getPipelines, getStages, Pipeline, PipelineStage, createDeal, updateDeal } from '../../pipeline/api';
import { messagingStore } from '../../../store/messagingStore';
import { ChevronDown, Loader2 } from 'lucide-react';
import { showToast } from '../../../utils/toast';

interface StagePopupProps {
  conversation: Conversation;
}

export function StagePopup({ conversation }: StagePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const contact = conversation.contact;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && stages.length === 0) {
      loadPipelineData();
    }
  }, [isOpen]);

  const loadPipelineData = async () => {
    setLoading(true);
    try {
      const pipelines = await getPipelines();
      const activePipeline = pipelines.find(p => p.is_active) || pipelines[0];
      if (activePipeline) {
        setPipeline(activePipeline);
        const stgs = await getStages(activePipeline.id);
        setStages(stgs.sort((a, b) => a.order - b.order));
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to load pipeline stages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStage = async (stage: PipelineStage) => {
    setIsOpen(false);
    
    // Optimistic Update
    const prevContact = { ...contact };
    messagingStore.updateConversationMeta(conversation.id, {
      contact: { ...contact, stage_name: stage.title, stage_color: stage.color }
    });

    try {
      if (contact.active_deal_id) {
        await updateDeal(contact.active_deal_id, { stage: stage.id });
      } else if (pipeline) {
        const deal = await createDeal({
          name: contact.name || contact.phone,
          value: 0,
          pipeline: pipeline.id,
          stage: stage.id,
          wa_contact: contact.id
        });
        messagingStore.updateConversationMeta(conversation.id, {
          contact: { ...contact, stage_name: stage.title, stage_color: stage.color, active_deal_id: deal.id }
        });
      }
      showToast('Success', `Stage updated to ${stage.title}`, 'success');
    } catch (err) {
      console.error(err);
      messagingStore.updateConversationMeta(conversation.id, { contact: prevContact });
      showToast('Error', 'Failed to update stage', 'error');
    }
  };

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Edit Pipeline Stage"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold transition-all shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
      >
        {contact.stage_name ? (
          <>
            <span className="h-2 w-2 rounded-full" style={{ background: contact.stage_color || '#ccc' }} />
            <span className="text-[10px] text-slate-700 dark:text-slate-300 uppercase tracking-wider">{contact.stage_name}</span>
          </>
        ) : (
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">No Stage</span>
        )}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Set Pipeline Stage</span>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : stages.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">No stages found</div>
            ) : (
              stages.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => handleSelectStage(stage)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition text-left"
                >
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: stage.color || '#ccc' }} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{stage.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
