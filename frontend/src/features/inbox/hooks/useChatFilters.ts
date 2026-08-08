import { useState, useMemo } from 'react';
import type { Conversation } from '../../../api/messaging';

export function useChatFilters(chats: Conversation[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'recent' | 'stage'>(() => {
    return (localStorage.getItem('chatSortBy') as 'recent' | 'stage') || 'recent';
  });

  const filteredChats = useMemo(() => {
    let result = chats.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (c.contact?.name || "").toLowerCase();
      const phone = (c.contact?.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });

    if (sortBy === 'stage') {
      result.sort((a, b) => {
        const orderA = a.contact?.stage_order ?? 9999;
        const orderB = b.contact?.stage_order ?? 9999;
        if (orderA === orderB) {
           const timeA = a.last_message_at || a.last_inbound_at || '';
           const timeB = b.last_message_at || b.last_inbound_at || '';
           return timeB.localeCompare(timeA);
        }
        return orderA - orderB;
      });
    } else {
      result.sort((a, b) => {
         const timeA = a.last_message_at || a.last_inbound_at || '';
         const timeB = b.last_message_at || b.last_inbound_at || '';
         return timeB.localeCompare(timeA);
      });
    }

    return result;
  }, [chats, statusFilter, searchQuery, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    filteredChats
  };
}
