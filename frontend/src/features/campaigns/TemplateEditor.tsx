import React, { useState } from "react";

export function TemplateEditor() {
  const [templateText, setTemplateText] = useState(
    "Hi {{1}}! Thanks for choosing Acme. Your booking reference is {{2}}."
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition duration-200">
      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2 font-sans">Meta WABA Template Editor</h3>
      <p className="text-[10px] text-slate-505 text-slate-500 dark:text-slate-400 font-semibold">
        Create message templates with variables (e.g. {"{{1}}"}). Templates must be submitted to Meta for validation.
      </p>

      <div>
        <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">
          Template Body
        </label>
        <textarea
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          rows={4}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:border-[#007e3a]"
        />
      </div>

      <button
        onClick={() => alert("Template submitted to Meta for approval!")}
        className="w-full py-2 border border-[#007e3a] text-[#007e3a] hover:bg-[#007e3a]/5 text-xs font-bold rounded-lg transition duration-200"
      >
        Submit Template to Meta
      </button>
    </div>
  );
}

export default TemplateEditor;
