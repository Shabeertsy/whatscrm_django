import React, { useState, useEffect } from "react";
import { X, Megaphone, Loader2, Calendar, Users, Search, CheckCircle2, Circle, User, Bookmark } from "lucide-react";
import { whatsappApi } from "../../../api/whatsapp";
import { contactsApi } from "../../../api/contacts";
import { Campaign } from "../api";

export interface CampaignDataPayload {
  name: string;
  template_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  target_type: "all" | "specific";
  contacts?: string[];
  frequency?: "once" | "daily" | "weekly" | "monthly" | "custom";
  custom_days_gap?: number | null;
}

interface CampaignWizardProps {
  initialData?: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (payload: CampaignDataPayload, campaignId?: string) => Promise<void>;
}

export function CampaignWizard({ initialData, isOpen, onClose, onLaunch }: CampaignWizardProps) {
  const isEditing = !!initialData?.id;
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [customDaysGap, setCustomDaysGap] = useState<number | "">("");

  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date helper for datetime-local input
  const formatForInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const availableStages = React.useMemo(() => {
    const stagesMap = new Map<string, { name: string; color: string }>();
    contactsList.forEach(c => {
      if (c.stage_name) {
        stagesMap.set(c.stage_name, { name: c.stage_name, color: c.stage_color });
      }
    });
    return Array.from(stagesMap.values());
  }, [contactsList]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || "");
        setTemplate(initialData.template_name || "");
        setStartDate(formatForInput(initialData.start_date));
        setEndDate(formatForInput(initialData.end_date));
        setTargetType(initialData.target_type || "all");
        setSelectedContacts(initialData.contacts || []);
        setFrequency(initialData.frequency || "once");
        setCustomDaysGap(initialData.custom_days_gap ?? "");
      } else {
        setName("");
        setTemplate("");
        setStartDate("");
        setEndDate("");
        setTargetType("all");
        setSelectedContacts([]);
        setFrequency("once");
        setCustomDaysGap("");
      }
      setContactSearch("");
      setSelectedStageFilter("all");
      loadTemplates();
      loadContacts();
    }
  }, [isOpen, initialData]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await whatsappApi.listTemplates();
      const list = Array.isArray(res.data) ? res.data : (res.data as any).results || [];

      // Filter ONLY Campaign Templates
      const campaignOnly = list.filter((t: any) => t.template_type === 'CAMPAIGN');
      setTemplatesList(campaignOnly);
      if (campaignOnly.length > 0 && !initialData?.template_name) {
        setTemplate(campaignOnly[0].name || campaignOnly[0].id);
      }
    } catch (e) {
      console.error("Failed to load templates for campaign wizard", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await contactsApi.getContacts({ page_size: 100 });
      const list = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
      setContactsList(list);
    } catch (e) {
      console.error("Failed to load contacts for campaign wizard", e);
    } finally {
      setLoadingContacts(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelectContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter((cId) => cId !== id));
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  const toggleSelectAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id));
    }
  };

  const filteredContacts = contactsList.filter((c) => {
    if (selectedStageFilter !== "all" && c.stage_name !== selectedStageFilter) {
      return false;
    }
    const query = contactSearch.toLowerCase();
    const cName = (c.name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase();
    const cPhone = (c.phone || c.phone_number || '').toLowerCase();
    const cStageName = (c.stage_name || '').toLowerCase();
    const cStageColor = (c.stage_color || '').toLowerCase();
    return cName.includes(query) || cPhone.includes(query) || cStageName.includes(query) || cStageColor.includes(query);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onLaunch(
        {
          name: name.trim(),
          template_name: template,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null,
          target_type: targetType,
          contacts: targetType === "specific" ? selectedContacts : [],
          frequency: frequency,
          custom_days_gap: frequency === "custom" && customDaysGap !== "" ? Number(customDaysGap) : null,
        },
        initialData?.id
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 transition duration-200 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-[#007e3a]">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {isEditing ? "Edit Broadcast Campaign" : "Create Broadcast Campaign"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-7 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Top Section: 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: Campaign Details */}
              <div className="bg-slate-50/80 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Megaphone className="h-4 w-4 text-[#007e3a]" />
                  <span>Campaign Settings</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Campaign Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      WhatsApp Message Template
                    </label>
                    {loadingTemplates ? (
                      <div className="flex items-center gap-2 p-3 text-xs text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" /> Loading campaign templates...
                      </div>
                    ) : (
                      <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] transition disabled:opacity-60 cursor-pointer"
                        disabled={isSubmitting || templatesList.length === 0}
                      >
                        {templatesList.length > 0 ? (
                          templatesList.map((t) => (
                            <option key={t.id || t.name} value={t.name}>
                              {t.name} ({t.category || "MARKETING"})
                            </option>
                          ))
                        ) : (
                          <option value="">No Campaign Templates found</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Schedule Date Range */}
              <div className="bg-slate-50/80 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Calendar className="h-4 w-4 text-[#007e3a]" />
                  <span>Schedule Date Range (Optional)</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Repetition Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
                    disabled={isSubmitting}
                  >
                    <option value="once">One-time (Do not repeat)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Day Gap</option>
                  </select>
                </div>

                {frequency === "custom" && (
                  <div className="pt-1 animate-in slide-in-from-top-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Repeat every (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customDaysGap}
                      onChange={(e) => setCustomDaysGap(e.target.value ? parseInt(e.target.value) : "")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
                      disabled={isSubmitting}
                      required={frequency === "custom"}
                      placeholder="e.g. 14"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Target Audience Selection */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Users className="h-4 w-4 text-[#007e3a]" />
                  <span>Target Audience</span>
                </label>

                {/* Toggle option buttons */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setTargetType("all")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${targetType === "all"
                      ? "bg-white dark:bg-slate-900 text-[#007e3a] shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                  >
                    All Contacts
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("specific")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${targetType === "specific"
                      ? "bg-white dark:bg-slate-900 text-[#007e3a] shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                  >
                    Specific Contacts
                  </button>
                </div>
              </div>

              {/* If Specific Contacts is selected */}
              {targetType === "specific" && (
                <div className="bg-slate-50/80 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 animate-in fade-in duration-150">
                  {/* Search & Actions Bar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[150px]">
                      <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
                      />
                    </div>
                    
                    {availableStages.length > 0 && (
                      <select
                        value={selectedStageFilter}
                        onChange={(e) => setSelectedStageFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a] max-w-[180px]"
                      >
                        <option value="all">All Stages</option>
                        {availableStages.map((stage) => (
                          <option key={stage.name} value={stage.name}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {filteredContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAllContacts}
                        className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#007e3a] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl transition whitespace-nowrap"
                      >
                        {selectedContacts.length === filteredContacts.length ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>

                  {/* Contact Selection Grid */}
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-8 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-[#007e3a] mr-2" /> Loading CRM contacts...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No contacts matching search query.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 pr-1.5 custom-scrollbar">
                      {filteredContacts.map((c) => {
                        const isSelected = selectedContacts.includes(c.id);
                        const displayName = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.phone || 'Unnamed Contact';
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleSelectContact(c.id)}
                            className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition select-none ${isSelected
                              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-sm"
                              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 font-bold text-[11px]">
                                {displayName.charAt(0).toUpperCase() || <User className="h-3.5 w-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold truncate flex items-center gap-1.5">
                                  {displayName}
                                  {c.stage_color && (
                                    <span title={c.stage_name || "In Pipeline Stage"} className="flex items-center shrink-0">
                                      <Bookmark
                                        className="w-3.5 h-3.5 opacity-100 drop-shadow-sm"
                                        style={{ color: c.stage_color, fill: c.stage_color }}
                                      />
                                    </span>
                                  )}
                                </div>
                                {c.phone && <div className="text-[10px] text-slate-400 truncate">{c.phone}</div>}
                              </div>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4 text-[#007e3a] shrink-0 fill-[#007e3a]/10" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300 dark:text-slate-700 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Showing {filteredContacts.length} contacts
                    </span>
                    <span className="text-[11px] font-bold text-[#007e3a] bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                      {selectedContacts.length} Selected
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Action Buttons Footer outside scroll area */}
          <div className="px-7 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 text-xs transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (targetType === "specific" && selectedContacts.length === 0)}
              className="px-7 py-2.5 bg-gradient-to-r from-[#007e3a] to-[#00a84e] hover:from-[#00602d] hover:to-[#008f42] text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center min-w-[140px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Launch Broadcast"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampaignWizard;
