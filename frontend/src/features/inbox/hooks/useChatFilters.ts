import { useState, useMemo, useEffect } from 'react';
import type { Conversation } from '../../../api/messaging';
import { getStages, PipelineStage } from '../../pipeline/api';

export type AssignmentFilter = 'all' | 'mine' | 'unassigned';

export function useChatFilters(chats: Conversation[], selectedChatId?: string | null) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [allStages, setAllStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    // Fetch all stages for the active pipeline
    getStages().then(stages => setAllStages(stages)).catch(err => console.error("Failed to load stages:", err));
  }, []);

  const availableStages = useMemo(() => {
    // Return all stage titles from the active pipeline
    return allStages.map(s => s.title);
  }, [allStages]);

  const filteredChats = useMemo(() => {
    let result = chats.filter((c) => {
      // If this conversation is currently selected, always keep it visible in the list
      if (selectedChatId && String(c.id) === String(selectedChatId)) {
        return true;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      if (stageFilter !== "all" && c.contact?.stage_name !== stageFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (c.contact?.name || "").toLowerCase();
      const phone = (c.contact?.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });

    result.sort((a, b) => {
      const timeA = a.last_message_at || a.last_inbound_at || '';
      const timeB = b.last_message_at || b.last_inbound_at || '';
      return timeB.localeCompare(timeA);
    });

    return result;
  }, [chats, statusFilter, searchQuery, stageFilter, selectedChatId]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
    assignmentFilter,
    setAssignmentFilter,
    availableStages,
    filteredChats
  };
}
