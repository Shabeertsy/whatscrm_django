import React, { useState } from 'react';
import { X } from 'lucide-react';

interface StickerMessageProps {
  mediaUrl: string;
}

export function StickerMessage({ mediaUrl }: StickerMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div 
        className="mb-2 bg-transparent cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <img 
          src={mediaUrl} 
          alt="Sticker" 
          className="max-w-[150px] max-h-[150px] w-auto h-auto object-contain drop-shadow-sm hover:opacity-90 transition-opacity" 
        />
      </div>

      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={mediaUrl} 
            alt="Expanded sticker" 
            className="max-w-[80vw] max-h-[80vh] object-contain drop-shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
