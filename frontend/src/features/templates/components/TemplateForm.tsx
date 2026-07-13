import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface TemplateFormProps {
  initialData?: any;
  instanceId: string;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export function TemplateForm({ initialData, instanceId, onClose, onSubmit }: TemplateFormProps) {
  const isEditing = !!initialData?.id;
  const [name, setName] = useState(initialData?.name || "");
  const [language, setLanguage] = useState(initialData?.language || "en_US");
  const [category, setCategory] = useState(initialData?.category || "MARKETING");
  
  // Extract existing components if editing/duplicating
  const initialHeader = initialData?.components?.find((c: any) => c.type === "HEADER")?.text || "";
  const initialBody = initialData?.components?.find((c: any) => c.type === "BODY")?.text || "";
  const initialFooter = initialData?.components?.find((c: any) => c.type === "FOOTER")?.text || "";
  
  const [headerText, setHeaderText] = useState(initialHeader);
  const [bodyText, setBodyText] = useState(initialBody);
  const [footerText, setFooterText] = useState(initialFooter);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyText.trim()) {
      setError("Body text is required.");
      return;
    }
    if (!isEditing && !name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!isEditing && !instanceId) {
      setError("Please select an instance first.");
      return;
    }

    setLoading(true);
    setError("");

    const components: any[] = [];
    
    if (headerText.trim()) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: headerText.trim()
      });
    }

    components.push({
      type: "BODY",
      text: bodyText.trim()
    });

    if (footerText.trim()) {
      components.push({
        type: "FOOTER",
        text: footerText.trim()
      });
    }

    const payload: any = {
      language,
      category,
      components,
    };
    if (!isEditing) {
      payload.name = name;
      payload.instance = instanceId;
    }

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      
      // Try to extract the deeply nested Meta error first
      const metaError = data?.details?.error?.error_user_msg 
                     || data?.details?.error?.message;
                     
      // Fallback to our own error, or a generic one
      setError(metaError || data?.error || "Failed to save template. Check console for details.");
      
      console.error("Template Save Error:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">
            {isEditing ? "Edit Template" : "Create Template"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Template Name {isEditing && "(Read-only)"}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              disabled={isEditing}
              placeholder="e.g. seasonal_promo"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
              >
                <option value="en_US">English (US)</option>
                <option value="en_GB">English (UK)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
              >
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Header <span className="text-slate-400 font-normal">(Optional)</span></label>
              <input
                type="text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="e.g. Order Update"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Body <span className="text-red-500">*</span></label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                placeholder="Hello {{1}}, your booking is confirmed!"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] custom-scrollbar"
              />
              <p className="text-[10px] text-slate-500 mt-1">Variables must be sequential numbers in double braces: {"{{1}}"}, {"{{2}}"}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Footer <span className="text-slate-400 font-normal">(Optional)</span></label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. Thank you for choosing us"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center bg-[#007e3a] hover:bg-[#00602d] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm w-full sm:w-auto min-w-[120px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit to Meta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
