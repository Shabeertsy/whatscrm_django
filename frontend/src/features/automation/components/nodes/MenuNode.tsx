import React from "react";
import { Menu, ListOrdered } from "lucide-react";
import { Handle, Position, NodeResizer } from "@xyflow/react";

export interface MenuOptionItem {
  id: string;
  label: string;
  value?: string;
}

interface MenuNodeProps {
  data: {
    title: string;
    description?: string;
    message?: string;
    invalidOptionMessage?: string;
    noMatchMessage?: string;
    options?: MenuOptionItem[];
  };
  selected?: boolean;
}

export function MenuNode({ data, selected }: MenuNodeProps) {
  const options = Array.isArray(data.options) ? data.options : [];
  const invalidMsg = data.invalidOptionMessage || data.noMatchMessage;

  return (
    <div className="w-full h-full relative">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        maxWidth={480}
        minHeight={190}
        lineStyle={{ border: "1.5px dashed #fb923c" }}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: "#fff", border: "2px solid #ea580c",
        }}
      />

      <div
        className={`absolute inset-0 overflow-hidden rounded-xl bg-white dark:bg-[#131924] transition-all duration-150 ${
          selected
            ? "border-2 border-orange-500 dark:border-orange-400 shadow-lg shadow-orange-500/20"
            : "border border-slate-200 dark:border-[#2a364d] shadow-sm"
        }`}
      >
        <div className="bg-orange-50 dark:bg-orange-950/40 px-3 py-2 border-b border-orange-100 dark:border-orange-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Menu className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider">
              Menu Options
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-orange-600 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
            <ListOrdered className="h-3 w-3" />
            {options.length}
          </span>
        </div>

        <div className="p-2.5 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100% - 36px)" }}>
          <div>
            <h4 className="font-semibold text-[12px] text-slate-900 dark:text-white leading-tight">
              {data.title || "Menu Options"}
            </h4>
            {data.message && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-2">
                {data.message}
              </p>
            )}
          </div>

          {options.length > 0 ? (
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              {options.map((opt, index) => (
                <div
                  key={opt.id || index}
                  className="flex items-center justify-between bg-slate-50 dark:bg-[#1C2333] border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-[10px] relative"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-4">
                    {opt.label || `Option ${index + 1}`}
                  </span>
                  {opt.value && (
                    <span className="text-[9px] bg-slate-200/70 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded font-mono shrink-0 ml-1">
                      {opt.value}
                    </span>
                  )}
                  {opt.id && (
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={opt.id}
                      className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924] !-right-1"
                      style={{ top: "50%", transform: "translate(50%, -50%)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic text-center py-1">No options yet</div>
          )}

          {invalidMsg && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Wrong reply: </span>
              <span className="italic line-clamp-1">{invalidMsg}</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#131924]" />
    </div>
  );
}

export default MenuNode;
