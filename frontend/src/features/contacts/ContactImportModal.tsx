import React, { useState } from "react";
import { Upload } from "lucide-react";

interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (count: number) => void;
}

export function ContactImportModal({ isOpen, onClose, onImport }: ContactImportModalProps) {
  const [fileSelected, setFileSelected] = useState(false);

  if (!isOpen) return null;

  const handleImport = () => {
    onImport(12); // Simulate importing 12 contacts
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">Import Contacts</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4">
          Upload a CSV or Excel list with name, phone, and email headers to bulk-load contacts.
        </p>

        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 cursor-pointer hover:border-[#007e3a] dark:hover:border-[#007e3a] transition duration-200 mb-6" onClick={() => setFileSelected(true)}>
          <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
          <span className="text-xs text-slate-655 text-slate-600 dark:text-slate-300 font-bold">
            {fileSelected ? "contacts_list_june.csv selected" : "Click to select a file"}
          </span>
        </div>

        <div className="flex justify-end space-x-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-55 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!fileSelected}
            className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white rounded-lg font-bold transition shadow-md shadow-[#007e3a]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Selected
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContactImportModal;
