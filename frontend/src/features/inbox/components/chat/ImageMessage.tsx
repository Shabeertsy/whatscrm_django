import React from 'react';

interface ImageMessageProps {
  mediaUrl: string;
}

export function ImageMessage({ mediaUrl }: ImageMessageProps) {
  return (
    <div className="mb-2 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
      <img src={mediaUrl} alt="Attached image" className="max-w-full h-auto object-cover max-h-64" />
    </div>
  );
}
