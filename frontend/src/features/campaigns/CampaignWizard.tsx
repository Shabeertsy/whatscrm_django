import React, { useState } from "react";

interface CampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (name: string) => void;
}

export function CampaignWizard({ isOpen, onClose, onLaunch }: CampaignWizardProps) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("welcome_opt_in");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLaunch(name);
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">Create Broadcast Campaign</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. July Summer Sale Offer"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block mb-1">WABA Message Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-slate-55 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="welcome_opt_in">welcome_opt_in (Meta Approved)</option>
              <option value="booking_reminder">booking_reminder (Meta Approved)</option>
              <option value="product_update">product_update (Meta Approved)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 text-xs pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-205 border-slate-200 dark:border-slate-700 hover:bg-slate-55 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-350 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white rounded-lg font-bold transition shadow-md shadow-[#007e3a]/10"
            >
              Launch Broadcast
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampaignWizard;
