import React from 'react';

interface TextMessageProps {
  body: string;
}

export function TextMessage({ body }: TextMessageProps) {
  return (
    <p className="whitespace-pre-wrap leading-snug sm:leading-normal break-words">
      {body.split(/(\*[^*]+\*|_[^_]+_)/g).map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return <strong key={i}>{part.slice(1, -1)}</strong>;
        }
        if (part.startsWith('_') && part.endsWith('_')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </p>
  );
}
