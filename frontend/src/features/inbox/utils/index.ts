import type { Message, Conversation } from '../../../api/messaging';

/**
 * Determines whether the WhatsApp 24-hour customer care window is still open.
 *
 * Priority:
 *  1. While messages are still loading → keep open (no false positives)
 *  2. If messages are loaded → scan for the last inbound timestamp
 *  3. Fall back to server-provided `last_inbound_at` on the conversation record
 */
export function isWhatsAppWindowOpen(
  conversation: Conversation | undefined,
  messages: Message[],
  isLoadingMessages: boolean,
): boolean {
  if (!conversation) return false;

  // 1. Loading guard – avoids briefly showing a false "window expired" banner
  if (isLoadingMessages) return true;

  // 2. Use backend's last_inbound_at as the authoritative source.
  //    It is set by the server only when a customer actually sends a message.
  //    - undefined/null → no inbound ever recorded → keep OPEN (we haven't heard from
  //      the customer yet, or backend field is missing; don't block proactively)
  const { last_inbound_at } = conversation;
  if (!last_inbound_at) return true;

  // 3. If messages are loaded, use the exact inbound timestamp for maximum accuracy
  //    (the messages array may be more up-to-date than last_inbound_at in the store)
  if (messages.length > 0) {
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    if (lastInbound) {
      const hoursSince = (Date.now() - new Date(lastInbound.timestamp).getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    }
    // Messages loaded but no inbound found → fall through to last_inbound_at check
  }

  // 4. Use last_inbound_at from the conversation record
  const hoursSince = (Date.now() - new Date(last_inbound_at).getTime()) / (1000 * 60 * 60);
  return hoursSince < 24;
}

/**
 * Format a timestamp into a short HH:MM time string.
 */
export function formatMessageTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a timestamp into a chat-list friendly string (time for today, date for older).
 */
export function formatChatListTime(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}
