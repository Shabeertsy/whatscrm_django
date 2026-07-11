import React from 'react';

interface VideoMessageProps {
  mediaUrl: string;
}

export function VideoMessage({ mediaUrl }: VideoMessageProps) {
  return (
    <div className="mb-2 rounded-md overflow-hidden bg-black/5 dark:bg-black/20 w-full max-w-[320px]">
      <video 
        src={mediaUrl} 
        controls 
        className="w-full h-auto max-h-64 rounded-md object-contain"
      />
    </div>
  );
}
