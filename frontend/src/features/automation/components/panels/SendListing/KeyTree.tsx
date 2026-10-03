import React, { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileJson, CheckCircle } from "lucide-react";
import { KeyNodeProps } from "./types";



export function KeyNode({ name, node, fullPath, onInsert, templateText }: KeyNodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (node === null || Object.keys(node).length === 0) {
    const isSelected = templateText.includes(`{{${fullPath}}}`);

    return (
      <div className="flex items-center py-0.5 ml-4">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onInsert(fullPath); }}
          className={`text-[10px] px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors text-left flex items-center gap-1.5 border ${isSelected
            ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 dark:bg-emerald-600 dark:border-emerald-500 dark:hover:bg-emerald-700"
            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/40"
            }`}
          title={isSelected ? `Remove {{${fullPath}}}` : `Insert {{${fullPath}}}`}
        >
          {isSelected ? <CheckCircle className="w-3 h-3 opacity-90" /> : <FileJson className="w-3 h-3 opacity-70" />}
          {name}
        </button>
      </div>
    );
  }


  return (
    <div className="ml-4 first:ml-0 mt-0.5">
      <div
        className="flex items-center gap-1.5 py-1 px-1.5 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-all select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3 h-3 text-emerald-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
        <Folder className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="font-mono truncate">{name}</span>
      </div>
      {isOpen && (
        <div className="border-l border-emerald-200/50 dark:border-emerald-800/30 ml-2 mt-0.5 mb-1 pl-1">
          {Object.entries(node).map(([childName, childNode]) => (
            <KeyNode
              key={childName}
              name={childName}
              node={childNode}
              fullPath={`${fullPath}.${childName}`}
              onInsert={onInsert}
              templateText={templateText}
            />
          ))}
        </div>
      )}
    </div>
  );
}
