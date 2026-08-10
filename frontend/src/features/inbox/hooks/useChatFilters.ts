import { useState, useMemo } from 'react';
import type { Conversation } from '../../../api/messaging';



export function useChatFilters(chats: Conversation[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const availableStages = useMemo(() => {
    const stages = new Set<string>();
    chats.forEach(c => {
      if (c.contact?.stage_name) {
        stages.add(c.contact.stage_name);
      }
    });
    return Array.from(stages).sort();
  }, [chats]);

  const filteredChats = useMemo(() => {
    let result = chats.filter((c) => {
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
  }, [chats, statusFilter, searchQuery, stageFilter]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
    availableStages,
    filteredChats
  };
}
