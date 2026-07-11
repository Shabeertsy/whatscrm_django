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
      className="flex items-center gap-3 bg-black/5 dark:bg-white/10 p-3 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors max-w-[280px]"
    >
      <div className="bg-blue-500/10 p-2 rounded-md">
        <FileText className="w-6 h-6 text-blue-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
          {filename}
        </p>
        <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-semibold">
          {msgType}
        </p>
      </div>
      
      <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <Download className="w-4 h-4" />
      </div>
    </a>
  );
}
