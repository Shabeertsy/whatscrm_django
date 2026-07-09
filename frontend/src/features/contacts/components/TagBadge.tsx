import React from 'react';
import { CTag } from '../utils/types';
import { X } from 'lucide-react';

interface TagBadgeProps {
  tag: CTag;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
      style={{ background: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-75 hover:opacity-100 focus:outline-none">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
