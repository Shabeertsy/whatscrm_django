import React, { memo } from 'react';
import { Reply, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Message } from '../../../../api/messaging';

import { ReplyPreview } from './ReplyPreview';
import { TextMessage } from './text/TextMessage';
import { ImageMessage } from './photo/ImageMessage';
import { VideoMessage } from './video/VideoMessage';
import { AudioMessage } from './audio/AudioMessage';
import { DocumentMessage } from './document/DocumentMessage';
import { TemplateMessage } from './template/TemplateMessage';
import { MessageStatus } from './MessageStatus';



interface MessageBubbleProps {
  message: Message;
  isOutbound: boolean;
  onReply?: (m: Message) => void;
  onDelete?: (id: string) => void;
}



export const MessageBubble = memo(function MessageBubble({ message, isOutbound, onReply, onDelete }: MessageBubbleProps) {
  const navigate = useNavigate();

  return (
    <div className={`flex w-full ${isOutbound ? 'justify-end' : 'justify-start'} group mb-4`}>
      <div className={`flex items-center space-x-2 mr-2 ${isOutbound ? 'opacity-0 group-hover:opacity-100 transition-opacity' : 'hidden'}`}>
        {onReply && (
          <button 
            onClick={() => onReply(message)}
            className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={() => onDelete(message.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors"
            title="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div
        id={`message-${message.id}`}
        className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] shadow-sm relative transition-all duration-500 ${
          isOutbound
            ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none"
            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-transparent"
        }`}
      >
        {(message as any).replied_to_message && (
          <ReplyPreview 
            messageId={(message as any).replied_to_message.id}
            senderName={(message as any).replied_to_message.sent_by_name}
            msgType={(message as any).replied_to_message.msg_type}
            body={(message as any).replied_to_message.body}
            mediaUrl={(message as any).replied_to_message.media_url}
          />
        )}

        {message.msg_type === 'image' && message.media_url && <ImageMessage mediaUrl={message.media_url} />}
        {message.msg_type === 'video' && message.media_url && <VideoMessage mediaUrl={message.media_url} />}
        {message.msg_type === 'audio' && message.media_url && <AudioMessage mediaUrl={message.media_url} />}
        {message.msg_type !== 'text' && message.msg_type !== 'template' && !['image', 'video', 'audio'].includes(message.msg_type) && (
          <DocumentMessage msgType={message.msg_type} mediaUrl={message.media_url} />
        )}

        {message.msg_type === 'template' && message.body && <TemplateMessage body={message.body} />}
        {message.msg_type !== 'audio' && message.msg_type !== 'template' && message.body && <TextMessage body={message.body} />}

        {/* Room Details Link */}
        <div className="flex justify-end">
            {(message as any).related_room_uuid && (
            <button 
                onClick={() => navigate(`/hotels/${(message as any).related_room_uuid}`, { state: { fromChat: true } })}
                className={`flex items-center gap-1 font-medium hover:underline mt-1 text-[9px] ${isOutbound ? "text-[#005c4b] dark:text-[#dcf8c6]" : "text-[#007e3a] dark:text-[#00b359]"}`}
                title="View Room Details"
            >
                <ExternalLink className="h-3 w-3" /> View Room
            </button>
            )}
        </div>

        <MessageStatus 
          status={message.status} 
          isOutbound={isOutbound} 
          timestamp={message.timestamp} 
        />
      </div>

      <div className={`flex items-center space-x-2 ml-2 ${!isOutbound ? 'opacity-0 group-hover:opacity-100 transition-opacity' : 'hidden'}`}>
        {onReply && (
          <button 
            onClick={() => onReply(message)}
            className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={() => onDelete(message.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-colors"
            title="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});
