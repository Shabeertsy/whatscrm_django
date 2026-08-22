import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X, Megaphone, Loader2, Calendar, Users, Search, CheckCircle2, Circle,
  User, Bookmark, Upload, FileText, Download, AlertCircle, CheckCheck
} from "lucide-react";
import { whatsappApi } from "../../../api/whatsapp";
import { contactsApi } from "../../../api/contacts";
import { Campaign } from "../api";
import toast from "react-hot-toast";

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

interface CSVRow {
  name: string;
  phone: string;
  email: string;
}


export function CampaignWizard({ initialData, isOpen, onClose, onLaunch }: CampaignWizardProps) {
  const isEditing = !!initialData?.id;

  // ─── ALL useState hooks first ───────────────────────────────────────────────
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific" | "csv">("all");
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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [csvParseError, setCsvParseError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);



  // ─── useMemo ──────────────
  const availableStages = useMemo(() => {
    const stagesMap = new Map<string, { name: string; color: string }>();
    contactsList.forEach(c => {
      if (c.stage_name) {
        stagesMap.set(c.stage_name, { name: c.stage_name, color: c.stage_color });
      }
    });
    return Array.from(stagesMap.values());
  }, [contactsList]);

  const filteredContacts = useMemo(() => contactsList.filter((c) => {
    if (selectedStageFilter !== "all" && c.stage_name !== selectedStageFilter) return false;
    const query = contactSearch.toLowerCase();
    const cName = (c.name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase();
    const cPhone = (c.phone || c.phone_number || '').toLowerCase();
    const cStageName = (c.stage_name || '').toLowerCase();
    return cName.includes(query) || cPhone.includes(query) || cStageName.includes(query);
  }), [contactsList, contactSearch, selectedStageFilter]);

  // ─── Helper functions (no hooks) ────────────────────────────────────────────
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

  const resetCSVState = useCallback(() => {
    setCsvFile(null);
    setCsvRows([]);
    setCsvParseError("");
    setIsDragOver(false);
    setIsImporting(false);
    setImportResult(null);
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await whatsappApi.listTemplates();
      const list = Array.isArray(res.data) ? res.data : (res.data as any).results || [];
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
  }, [initialData?.template_name]);

  const loadContacts = useCallback(async () => {
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
  }, []);

  const parseCSV = useCallback((text: string): CSVRow[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const emailIdx = headers.indexOf('email');
    if (nameIdx === -1 || phoneIdx === -1) {
      throw new Error('CSV must have "name" and "phone" columns.');
    }
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      return {
        name: cols[nameIdx] || '',
        phone: cols[phoneIdx] || '',
        email: emailIdx !== -1 ? (cols[emailIdx] || '') : '',
      };
    }).filter(r => r.phone);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvParseError('Please upload a .csv file.');
      setCsvFile(null);
      setCsvRows([]);
      return;
    }
    setCsvFile(file);
    setCsvParseError('');
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target?.result as string);
        setCsvRows(rows);
        if (rows.length === 0) setCsvParseError('No valid rows found in CSV.');
      } catch (err: any) {
        setCsvParseError(err.message || 'Failed to parse CSV.');
        setCsvRows([]);
      }
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ─── useEffect (must be after all other hooks) ───────────────────────────────
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
      resetCSVState();
      loadTemplates();
      loadContacts();
    }
  }, [isOpen, initialData]);

  // ─── Non-hook handlers ───────────────────────────────────────────────────────
  const toggleSelectContact = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id));
    }
  };

  const handleImportAndSelect = async () => {
    if (!csvFile) return;
    setIsImporting(true);
    try {
      const res = await contactsApi.importContactsFromCSV(csvFile);
      const data = res.data as any;
      const importedContacts: any[] = data.imported || [];
      const newIds = importedContacts.map((c: any) => c.id);
      setContactsList(prev => {
        const existingIds = new Set(prev.map((c: any) => c.id));
        const fresh = importedContacts.filter((c: any) => !existingIds.has(c.id));
        return [...fresh, ...prev];
      });
      setSelectedContacts(prev => Array.from(new Set([...prev, ...newIds])));
      setImportResult({ imported: data.imported_count || 0, skipped: data.skipped_count || 0 });
      toast.success(`Imported ${data.imported_count} contact(s) successfully!`);
      loadContacts();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to import CSV.';
      toast.error(msg);
      setCsvParseError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `name,phone,email\nJohn Doe,+1234567890,john@example.com\nJane Smith,+0987654321,jane@example.com`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
          target_type: targetType === "csv" ? "specific" : targetType,
          contacts: (targetType === "specific" || targetType === "csv") ? selectedContacts : [],
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



  // ─── Early return AFTER all hooks ─────────
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 transition duration-200 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">

        {/* Modal Header */}
        <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-[#007e3a]">
              <Megaphone className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              {isEditing ? "Edit Broadcast Campaign" : "Create Broadcast Campaign"}
            </h3>
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

            {/* Top 2-column grid */}
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

              {/* Column 2: Schedule */}
              <div className="bg-slate-50/80 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Calendar className="h-4 w-4 text-[#007e3a]" />
                  <span>Schedule Date Range (Optional)</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Start Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007e3a]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">End Date &amp; Time</label>
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
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Repetition Frequency</label>
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
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Repeat every (Days)</label>
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

            {/* Target Audience */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Users className="h-4 w-4 text-[#007e3a]" />
                  <span>Target Audience</span>
                </label>
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setTargetType("all")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${targetType === "all"
                      ? "bg-white dark:bg-slate-900 text-[#007e3a] shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  >
                    All Contacts
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("specific")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${targetType === "specific"
                      ? "bg-white dark:bg-slate-900 text-[#007e3a] shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  >
                    Specific Contacts
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTargetType("csv"); resetCSVState(); }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${targetType === "csv"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Import CSV
                    {targetType === "csv" && importResult && (
                      <span className="ml-0.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {importResult.imported}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Specific Contacts Panel */}
              {targetType === "specific" && (
                <div className="bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-4 space-y-3.5">
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
                            <option key={stage.name} value={stage.name}>{stage.name}</option>
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

                    {loadingContacts ? (
                      <div className="flex items-center justify-center py-8 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-[#007e3a] mr-2" /> Loading CRM contacts...
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">No contacts matching search query.</div>
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
                                    {c.source === 'csv' && (
                                      <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">CSV</span>
                                    )}
                                    {c.stage_color && (
                                      <span title={c.stage_name || "In Pipeline Stage"} className="flex items-center shrink-0">
                                        <Bookmark className="w-3.5 h-3.5" style={{ color: c.stage_color, fill: c.stage_color }} />
                                      </span>
                                    )}
                                  </div>
                                  {c.phone && <div className="text-[10px] text-slate-400 truncate">{c.phone}</div>}
                                </div>
                              </div>
                              {isSelected
                                ? <CheckCircle2 className="h-4 w-4 text-[#007e3a] shrink-0 fill-[#007e3a]/10" />
                                : <Circle className="h-4 w-4 text-slate-300 dark:text-slate-700 shrink-0" />
                              }
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 px-1">
                      <span className="text-[11px] font-semibold text-slate-400">Showing {filteredContacts.length} contacts</span>
                      <span className="text-[11px] font-bold text-[#007e3a] bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                        {selectedContacts.length} Selected
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CSV Import Panel */}
              {targetType === "csv" && (
                <div className="bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Upload a CSV with columns:{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-200">name</span>,{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-200">phone</span>,{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-200">email</span> (optional)
                      </p>
                      <button
                        type="button"
                        onClick={downloadTemplate}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl transition"
                      >
                        <Download className="h-3 w-3" />
                        Download Template
                      </button>
                    </div>

                    {!csvFile ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onClick={() => csvInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDragOver
                          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 scale-[1.01]"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                          }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDragOver ? "bg-blue-100 dark:bg-blue-900/50" : "bg-slate-100 dark:bg-slate-800"}`}>
                          <Upload className={`h-5 w-5 ${isDragOver ? "text-blue-500" : "text-slate-400"}`} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {isDragOver ? "Drop your CSV here" : "Drag & drop CSV file"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">or click to browse files</p>
                        </div>
                        <input
                          ref={csvInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">{csvFile.name}</span>
                            <span className="text-[11px] text-blue-400">{csvRows.length} rows</span>
                          </div>
                          <button type="button" onClick={resetCSVState} className="text-slate-400 hover:text-red-500 transition">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {csvParseError && (
                          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {csvParseError}
                          </div>
                        )}

                        {csvRows.length > 0 && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preview (first 5 rows)</span>
                            </div>
                            <div className="overflow-x-auto max-h-36 overflow-y-auto custom-scrollbar">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Name</th>
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Phone</th>
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Email</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {csvRows.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{row.name || <span className="text-slate-400 italic">—</span>}</td>
                                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono">{row.phone}</td>
                                      <td className="px-3 py-2 text-slate-500">{row.email || <span className="text-slate-300 italic">—</span>}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {csvRows.length > 5 && (
                              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 text-center">
                                + {csvRows.length - 5} more rows
                              </div>
                            )}
                          </div>
                        )}

                        {importResult && (
                          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5 text-xs">
                            <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                              {importResult.imported} imported, {importResult.skipped} skipped
                            </span>
                            <span className="ml-auto text-emerald-600 font-bold">All selected ✓</span>
                          </div>
                        )}

                        {!importResult && csvRows.length > 0 && (
                          <button
                            type="button"
                            onClick={handleImportAndSelect}
                            disabled={isImporting}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isImporting ? (
                              <><Loader2 className="h-4 w-4 animate-spin" /> Importing {csvRows.length} contacts...</>
                            ) : (
                              <><Upload className="h-4 w-4" /> Import &amp; Select All ({csvRows.length} contacts)</>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {selectedContacts.length > 0 && (
                      <p className="text-[11px] text-emerald-600 font-semibold text-center">
                        {selectedContacts.length} contacts selected for this campaign
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
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
              disabled={isSubmitting || ((targetType === "specific" || targetType === "csv") && selectedContacts.length === 0)}
              className="px-7 py-2.5 bg-gradient-to-r from-[#007e3a] to-[#00a84e] hover:from-[#00602d] hover:to-[#008f42] text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center min-w-[140px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : isEditing ? "Save Changes" : "Launch Broadcast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampaignWizard;
