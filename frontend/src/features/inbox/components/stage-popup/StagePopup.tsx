import React, { useEffect, useState, useRef } from 'react';
import { Conversation } from '../../../../api/messaging';
import { getPipelines, getStages, Pipeline, PipelineStage, createDeal, updateDeal, getDeal } from '../../../pipeline/api';
import { messagingStore } from '../../../../store/messagingStore';
import { ChevronDown } from 'lucide-react';
import { showToast } from '../../../../utils/toast';
import { DealNoteSection } from './DealNoteSection';
import { StageListSection } from './StageListSection';


interface StagePopupProps {
  conversation: Conversation;
}


export function StagePopup({ conversation }: StagePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [note, setNote] = useState("");
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
    if (isOpen) {
      if (stages.length === 0) {
        loadPipelineData();
      }
      fetchDealNote();
    }
  }, [isOpen, contact.active_deal_id]);


  const fetchDealNote = async () => {
    if (contact.active_deal_id) {
      try {
        const deal = await getDeal(contact.active_deal_id);
        setNote(deal?.note || "");
      } catch (err) {
        console.error("Failed to fetch deal note:", err);
      }
    } else {
      setNote("");
    }
  };


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


  const handleNoteBlur = async () => {
    if (contact.active_deal_id) {
      try {
        await updateDeal(contact.active_deal_id, { note: note.trim() });
      } catch (err) {
        console.error("Failed to auto-save note:", err);
      }
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
        await updateDeal(contact.active_deal_id, { stage: stage.id, ...(note.trim() && { note: note.trim() }) });
      } else if (pipeline) {
        const deal = await createDeal({
          name: contact.name || contact.phone,
          value: 0,
          pipeline: pipeline.id,
          stage: stage.id,
          wa_contact: contact.id,
          ...(note.trim() && { note: note.trim() })
        });
        messagingStore.updateConversationMeta(conversation.id, {
          contact: { ...contact, stage_name: stage.title, stage_color: stage.color, active_deal_id: deal.id }
        });
      }
      setNote("");
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
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Update Pipeline Deal</span>
          </div>

          <DealNoteSection
            note={note}
            onChange={setNote}
            onBlur={handleNoteBlur}
          />

          <StageListSection 
            loading={loading} 
            stages={stages} 
            onSelectStage={handleSelectStage} 
          />
        </div>
      )}
    </div>
  );
}
