import React from 'react';

interface TextMessageProps {
  body: string;
}

export function TextMessage({ body }: TextMessageProps) {
  return (
    <p className="whitespace-pre-wrap leading-snug sm:leading-normal break-words font-light text-[8.5px] sm:text-[9px] md:text-[9.5px] lg:text-[10px] xl:text-[10.5px]">
      {body.split(/(\*{1,2}[^*]+\*{1,2}|_[^_]+_)/g).map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          const clean = part.replace(/^\*+|\*+$/g, '');
          return (
            <span key={i} className="font-light" style={{ fontWeight: 300 }}>
              {clean}
            </span>
          );
        }
        if (part.startsWith('_') && part.endsWith('_')) {
          const clean = part.replace(/^_+|_+$/g, '');
          return <em key={i} className="italic font-light">{clean}</em>;
        }
        return part;
      })}
    </p>
  );
}
