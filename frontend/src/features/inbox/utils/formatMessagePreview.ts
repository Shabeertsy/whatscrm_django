export interface FormattedMessagePreview {
  text: string;
  badge?: string | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | null;
}

export function formatMessagePreview(lastMessage?: {
  body?: string;
  direction?: 'inbound' | 'outbound';
  msg_type?: string;
  media_url?: string;
} | null): FormattedMessagePreview {
  if (!lastMessage) {
    return { text: 'No messages yet' };
  }

  const { body = '', msg_type = 'text', media_url } = lastMessage;
  const trimmed = (body || '').trim();

  //  Raw JSON interactive / automated messages (e.g. interactive_buttons, hotel shares, flows)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        let content = '';
        if (parsed.body) {
          content = String(parsed.body);
        } else if (parsed.text) {
          content = String(parsed.text);
        } else if (parsed.title) {
          content = String(parsed.title);
        } else if (parsed.caption) {
          content = String(parsed.caption);
        }

        // Clean WhatsApp markdown (*bold*, _italic_, \n)
        content = content
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/_([^_]+)_/g, '$1')
          .replace(/\n+/g, ' • ')
          .replace(/\s+/g, ' ')
          .trim();

        const imgUrl = parsed.header_image_url || media_url || null;

        if (content) {
          return {
            text: content,
            badge: parsed.type === 'interactive_buttons' ? 'Interactive' : (msg_type !== 'text' ? msg_type : null),
            mediaUrl: imgUrl,
            mediaType: imgUrl ? 'image' : null,
          };
        }
      }
    } catch {
      // Not valid JSON, continue with normal formatting
    }
  }

  //  WhatsApp Template Messages (e.g. [Template: CAMPAIGN] Hello...)
  if (trimmed.includes('[Template:')) {
    const cleaned = trimmed.replace(/\[Template:[^\]]+\]\s*/i, '').trim();
    return {
      text: cleaned || trimmed,
      badge: 'Template',
      mediaUrl: media_url || null,
    };
  }

  //  Media messages
  if (msg_type === 'image') {
    const caption = trimmed && trimmed !== '[image]' ? trimmed : '';
    return {
      text: caption || 'Photo',
      mediaType: 'image',
      mediaUrl: media_url || null,
    };
  }

  if (msg_type === 'video') {
    const caption = trimmed && trimmed !== '[video]' ? trimmed : '';
    return {
      text: caption || 'Video',
      mediaType: 'video',
      mediaUrl: media_url || null,
    };
  }

  if (msg_type === 'audio' || msg_type === 'voice') {
    return {
      text: 'Voice message',
      mediaType: 'audio',
    };
  }

  if (msg_type === 'document') {
    return {
      text: trimmed || 'Document',
      mediaType: 'document',
    };
  }

  //  Standard text messages - clean newlines and markdown characters
  if (trimmed) {
    const cleaned = trimmed
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\n+/g, ' ')
      .trim();
    return {
      text: cleaned,
      mediaUrl: media_url || null,
    };
  }

  return {
    text: msg_type !== 'text' ? `[${msg_type}]` : '—',
  };
}
