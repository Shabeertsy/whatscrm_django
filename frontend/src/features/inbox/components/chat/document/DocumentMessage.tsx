import React from 'react';
import { FileText, Download } from 'lucide-react';

interface DocumentMessageProps {
  msgType: string;
  mediaUrl?: string;
}

export function DocumentMessage({ msgType, mediaUrl }: DocumentMessageProps) {
  const filename = mediaUrl ? mediaUrl.split('/').pop() || 'Document' : 'Document';
  
  return (
    <a 
      href={mediaUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-2 sm:gap-3 bg-black/5 dark:bg-white/10 p-2 sm:p-3 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors max-w-[280px]"
    >
      <div className="bg-blue-500/10 p-1.5 sm:p-2 rounded-md">
        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[9.5px] sm:text-[10px] md:text-[10.5px] font-medium truncate text-slate-800 dark:text-slate-200">
          {filename}
        </p>
        <p className="text-[7.5px] sm:text-[8px] md:text-[8.5px] text-slate-500 uppercase mt-0.5 font-semibold">
          {msgType}
        </p>
      </div>
      
      <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
    </a>
  );
}
