import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
  onAddAvailableTag: (tag: string) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, availableTags, onAddAvailableTag, placeholder = "Add tags..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTags = availableTags.filter(t => t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleAdd = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
      if (!availableTags.includes(t)) onAddAvailableTag(t);
    }
    setInputValue("");
    setShowDropdown(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[42px] focus-within:border-[#007e3a] transition-colors">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-[#007e3a]/10 text-[#007e3a] rounded-md text-xs font-bold">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 focus:outline-none">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent min-w-[120px] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
        />
      </div>
      {showDropdown && (inputValue || filteredTags.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto">
          {filteredTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAdd(tag)}
              className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {tag}
            </button>
          ))}
          {inputValue && !filteredTags.includes(inputValue) && !tags.includes(inputValue) && (
            <button
              type="button"
              onClick={() => handleAdd(inputValue)}
              className="w-full text-left px-4 py-2 text-xs text-[#007e3a] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Create "{inputValue}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
