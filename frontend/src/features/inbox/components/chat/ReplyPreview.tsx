import React from 'react';



interface ReplyPreviewProps {
  messageId: string;
  senderName: string;
  msgType: string;
  body: string;
  mediaUrl?: string;
}

export function ReplyPreview({ messageId, senderName, msgType, body, mediaUrl }: ReplyPreviewProps) {
  const scrollToMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#007e3a]', 'ring-offset-2', 'dark:ring-offset-slate-900');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#007e3a]', 'ring-offset-2', 'dark:ring-offset-slate-900');
      }, 2000);
    }
  };

  return (
    <div
      onClick={scrollToMessage}
      className="mb-1 p-1.5 rounded bg-black/5 hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/30 cursor-pointer border-l-2 border-[#007e3a] dark:border-[#00b359] text-[8.5px] sm:text-[9px] md:text-[9.5px] opacity-90 flex items-center justify-between gap-1.5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[7.5px] sm:text-[8px] md:text-[8.5px] text-[#007e3a] dark:text-[#00b359] mb-0.5">
          {senderName || "Customer"}
        </div>

        <div className="line-clamp-1 opacity-80 text-[8.5px] sm:text-[9px] md:text-[9.5px]">
          {(() => {
            if (msgType === 'interactive') {
              try {
                const parsed = JSON.parse(body);
                return `[Menu] ${parsed.body || 'Interactive message'}`;
              } catch {
                return `[Selection] ${body}`;
              }
            }
            return msgType === 'text' ? body : `[${msgType}] ${body || ''}`;
          })()}
        </div>

      </div>
      {mediaUrl && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded overflow-hidden bg-black/10">
          {['image', 'sticker'].includes(msgType) ? (
            <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
          ) : msgType === 'video' ? (
            <video src={mediaUrl} className="w-full h-full object-cover" />
          ) : null}
        </div>
      )}
    </div>
  );
}
