import { Check, CheckCheck, Clock } from 'lucide-react';
import { formatMessageTime } from '../../utils';

interface MessageStatusProps {
  status: string;
  isOutbound: boolean;
  timestamp: string | Date;
}

export function MessageStatus({ status, isOutbound, timestamp }: MessageStatusProps) {
  const timeStr = formatMessageTime(timestamp as string);

  return (
    <div className={`flex items-center justify-end space-x-1 mt-0.5 text-[7.5px] sm:text-[8px] md:text-[8.5px] ${isOutbound ? "text-[#537e42] dark:text-[#84a98c]" : "text-slate-400"}`}>
      <span>{timeStr}</span>
      {isOutbound && (
        <span className="flex items-center">
          {status === 'sent' && <Check className="h-2 w-2 inline" />}
          {status === 'delivered' && <CheckCheck className="h-2 w-2 inline" />}
          {status === 'read' && <CheckCheck className="h-2 w-2 inline text-blue-400" />}
          {status === 'failed' && <span className="text-rose-500 font-medium">Failed</span>}
          {!['sent', 'delivered', 'read', 'failed'].includes(status) && <Clock className="h-2 w-2 inline" />}
        </span>
      )}
    </div>
  );
}
