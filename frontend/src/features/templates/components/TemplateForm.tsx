import React, { useState } from "react";
import { X, Loader2, Smartphone, Check } from "lucide-react";
import { whatsappApi } from "../../../api/whatsapp";

interface TemplateFormProps {
  initialData?: any;
  instanceId: string;
  instances?: any[];
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export function TemplateForm({ initialData, instanceId, instances = [], onClose, onSubmit }: TemplateFormProps) {
  const isEditing = !!initialData?.id;
  const [selectedInstances, setSelectedInstances] = useState<string[]>(
    initialData?.instance 
      ? [initialData.instance] 
      : instances.map(i => i.id)
  );
  const [name, setName] = useState(initialData?.name || "");
  const [language, setLanguage] = useState(initialData?.language || "en_US");
  const [category, setCategory] = useState(initialData?.category || "MARKETING");
  const [templateType, setTemplateType] = useState(initialData?.template_type || "REGULAR");
  
  // Extract existing components if editing/duplicating
  const initialHeaderComp = initialData?.components?.find((c: any) => c.type === "HEADER");
  const initialHeaderType = initialHeaderComp?.format || "NONE";
  const initialHeader = initialHeaderComp?.text || "";
  const initialBody = initialData?.components?.find((c: any) => c.type === "BODY")?.text || "";
  const initialFooter = initialData?.components?.find((c: any) => c.type === "FOOTER")?.text || "";
  
  const [headerType, setHeaderType] = useState(initialHeaderType);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
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
    const targetInstances = isEditing ? [instanceId] : selectedInstances;
    if (targetInstances.length === 0) {
      setError("Please select at least one WhatsApp Line.");
      return;
    }

    setLoading(true);
    setError("");

    const components: any[] = [];
    
    if (headerType === "TEXT" && headerText.trim()) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: headerText.trim()
      });
    } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) {
      if (!isEditing) {
        if (!headerFile) {
          setError(`A sample ${headerType.toLowerCase()} file is required for media templates.`);
          setLoading(false);
          return;
        }
        try {
          const uploadRes = await whatsappApi.uploadTemplateMedia(targetInstances[0], headerFile);
          components.push({
            type: "HEADER",
            format: headerType,
            example: { header_handle: [uploadRes.data.header_handle] }
          });
        } catch (uploadErr: any) {
          setError(uploadErr.response?.data?.error || "Failed to upload sample media to Meta.");
          setLoading(false);
          return;
        }
      } else {
        // Editing existing media template (just preserve format, Meta usually doesn't require example for minor edits if it already exists, or we just keep it simple)
        components.push({ type: "HEADER", format: headerType });
      }
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
      template_type: templateType,
      components,
    };
    if (!isEditing) {
      payload.name = name;
      payload.instance = targetInstances[0];
      payload.instances = targetInstances;
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#007e3a]/10 flex items-center justify-center border border-[#007e3a]/20">
              <span className="text-[#007e3a] font-bold text-lg">T</span>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Template" : "Create WhatsApp Template"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Design your approved message structure for Meta.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[85vh] custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
            
            {/* LEFT COLUMN: Configuration */}
            <div className="w-full md:w-5/12 space-y-5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">Configuration</h3>
              
              {!isEditing && instances && instances.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      WhatsApp Lines <span className="text-red-500">*</span>
                    </label>
                    {instances.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedInstances.length === instances.length) {
                            setSelectedInstances([instances[0].id]);
                          } else {
                            setSelectedInstances(instances.map(i => i.id));
                          }
                        }}
                        className="text-[11px] text-[#007e3a] hover:underline font-medium"
                      >
                        {selectedInstances.length === instances.length ? "Clear Multi-Select" : "Select All"}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {instances.map((inst) => {
                      const checked = selectedInstances.includes(inst.id);
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => {
                            if (checked) {
                              if (selectedInstances.length > 1) {
                                setSelectedInstances(selectedInstances.filter(id => id !== inst.id));
                              }
                            } else {
                              setSelectedInstances([...selectedInstances, inst.id]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            checked
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#007e3a]/60 text-[#007e3a] dark:text-emerald-400 font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <Smartphone className={`h-3 w-3 ${checked ? 'text-[#007e3a] dark:text-emerald-400' : 'text-slate-400'}`} />
                          <span>{inst.display_name}</span>
                          {checked && <Check className="h-3 w-3 text-[#007e3a] dark:text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
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
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-500 mt-1">Lowercase and underscores only.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Template Usage / Type</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition cursor-pointer"
                >
                  <option value="REGULAR">Regular Template</option>
                  <option value="CAMPAIGN">Campaign Template</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition cursor-pointer"
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
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition cursor-pointer"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Content */}
            <div className="w-full md:w-7/12 space-y-5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">Message Content</h3>

              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
                
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl space-y-4 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Header Type <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={headerType}
                      onChange={(e) => setHeaderType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition cursor-pointer"
                      disabled={isEditing}
                    >
                      <option value="NONE">None</option>
                      <option value="TEXT">Text Header</option>
                      <option value="IMAGE">Image Header</option>
                      <option value="VIDEO">Video Header</option>
                      <option value="DOCUMENT">Document Header</option>
                    </select>
                  </div>

                  {headerType === "TEXT" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Enter header text (e.g. Order Update)"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition"
                      />
                    </div>
                  )}
                  
                  {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
                        type="file"
                        onChange={(e) => setHeaderFile(e.target.files?.[0] || null)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#007e3a]/10 file:text-[#007e3a] hover:file:bg-[#007e3a]/20 transition cursor-pointer"
                        disabled={isEditing}
                        accept={headerType === "IMAGE" ? "image/*" : headerType === "VIDEO" ? "video/*" : ".pdf,.doc,.docx"}
                      />
                      <p className="text-[10px] text-slate-500">A sample {headerType.toLowerCase()} file is required for Meta approval.</p>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Body <span className="text-red-500">*</span></label>
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={5}
                    placeholder="Hello {{1}}, your booking is confirmed!"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition custom-scrollbar shadow-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Variables must be sequential numbers in double braces: {"{{1}}"}, {"{{2}}"}</p>
                </div>

                {/* Footer */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Footer <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="e.g. Thank you for choosing us"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition shadow-sm text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center bg-[#007e3a] hover:bg-[#00602d] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm w-full sm:w-auto min-w-[140px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit to Meta"}
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
