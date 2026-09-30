import React, { useState } from "react";
import { Monitor, AlignLeft, Layers } from "lucide-react";
import { FIELD_TYPES } from "../utils/constants";



export function FlowVisualizer({ flowJson }: { flowJson: any }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!flowJson || !flowJson.screens || flowJson.screens.length === 0) return null;

  const screens = flowJson.screens;
  const activeScreen = screens[activeIdx];
  const formChildren = activeScreen?.layout?.children?.find((c: any) => c.type === "Form")?.children || [];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm">
      {/* Screen Tabs Header */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto bg-slate-50 dark:bg-slate-800/50 pt-2 px-2">
        {screens.map((screen: any, idx: number) => (
          <button
            key={screen.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeIdx === idx
              ? "border-[#007e3a] text-[#007e3a] dark:text-[#00c857]"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
          >
            Screen {idx + 1}
            {idx === screens.length - 1 && (
              <span className="text-xs text-emerald-500 font-normal">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Screen Content */}
      <div className="p-4 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Monitor className="w-4 h-4 text-slate-400" />
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{activeScreen.title || "Untitled Screen"}</h4>
          <span className="ml-auto text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {activeScreen.id}
          </span>
        </div>

        <div className="space-y-3">
          {formChildren.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-1">No fields in this screen.</p>
          ) : (
            formChildren.map((field: any, fIdx: number) => {
              const meta = FIELD_TYPES.find(t => t.type === field.type) || { icon: <AlignLeft className="w-3 h-3" />, label: field.type };
              const hasOptions = ["Dropdown", "RadioButtonsGroup", "CheckboxGroup"].includes(field.type);

              return (
                <div key={fIdx} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                  {/* Field Header (Read-only version of FieldRow) */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg border-b border-slate-100 dark:border-slate-800/50">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded flex-shrink-0">
                      {meta.icon} {meta.label || field.type}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {field.label}
                    </span>
                    <label className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0 opacity-80 cursor-not-allowed">
                      <input type="checkbox" checked={field.required} readOnly disabled className="accent-[#007e3a] w-3 h-3 cursor-not-allowed" />
                      Required
                    </label>
                  </div>

                  {/* Field Body / Options */}
                  <div className="px-4 py-3 bg-white dark:bg-slate-900/30 rounded-b-lg">
                    {hasOptions && (
                      <div className="space-y-2">
                        {Array.isArray(field["data-source"]) ? (
                          field["data-source"].map((opt: any, oIdx: number) => (
                            <div key={oIdx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <div className={`w-3.5 h-3.5 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${field.type === "RadioButtonsGroup" ? "rounded-full" : "rounded-sm"}`}>
                              </div>
                              <span className="bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded text-xs border border-slate-100 dark:border-slate-700">{opt.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-2">id: {opt.id}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-[#007e3a] dark:text-[#00c857] bg-[#007e3a]/5 dark:bg-[#00c857]/5 p-2 rounded-lg border border-[#007e3a]/10">
                            <Layers className="w-4 h-4" />
                            <span>Dynamic API Source: <code className="font-mono bg-white/50 dark:bg-black/20 px-1 rounded ml-1">{field["data-source"]}</code></span>
                          </div>
                        )}
                      </div>
                    )}

                    {!hasOptions && (
                      <div className="w-full h-9 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-md flex items-center px-3">
                        <span className="text-xs text-slate-400 italic">User text input...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
