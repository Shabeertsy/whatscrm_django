import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader, Braces, X, Copy, ClipboardCheck, Info, ChevronRight, ChevronDown, ChevronUp, Folder, FileJson } from "lucide-react";
import { FieldGroup, FieldInput, FieldTextarea, FieldSelect } from "../../ui/FormFields";
import { flowsApi } from "../../../../../api/flows";



import { SendListingProps, ParamRow } from "./types";
import { parseParams, serializeParams, buildTree } from "./utils";
import { KeyNode } from "./KeyTree";



const CARD_TEMPLATE_PLACEHOLDER = ` *Item {{__index}} of {{__total}}*

 {{name}}
 {{location}}
 {{room_type}} |  Rs {{price}}/month
 Available: {{available_from}}
 {{link}}`;



export function SendListingPanel({ nodeId, data, update, flowVariables = [], waFlowIds = [] }: SendListingProps) {
  const [params, setParams] = useState<ParamRow[]>(() => parseParams(data.queryParams));

  // Sync external data.queryParams changes into local state, but only when
  // the change comes from outside (not from our own updates). This prevents
  // the params list from resetting while the user is editing empty-key rows.
  const lastSerialized = useRef<string>(JSON.stringify(serializeParams(params)));
  useEffect(() => {
    const incoming = JSON.stringify(data.queryParams ?? {});
    if (incoming !== lastSerialized.current) {
      lastSerialized.current = incoming;
      setParams(parseParams(data.queryParams));
    }
  }, [data.queryParams]);



  // API Key Preview state 
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [apiKeyError, setApiKeyError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeInput, setActiveInput] = useState<string>("cardTemplate");

  const imageTemplates = Array.isArray(data.cardImageTemplates)
    ? (data.cardImageTemplates as string[])
    : [(data.cardImageTemplate as string) || ""];

  const imageLimits = Array.isArray(data.cardImageLimits)
    ? (data.cardImageLimits as (number | string)[])
    : [data.imageLimit !== undefined ? (data.imageLimit as number | string) : 4];

  const handleImageTemplatesChange = (newTemplates: string[], newLimits?: (number | string)[]) => {
    const limits = newLimits || [...imageLimits];
    while (limits.length < newTemplates.length) limits.push(4);
    if (limits.length > newTemplates.length) limits.length = newTemplates.length;

    update(nodeId, {
      cardImageTemplates: newTemplates,
      cardImageTemplate: newTemplates[0] || "",
      cardImageLimits: limits,
      imageLimit: limits[0] !== undefined ? limits[0] : 4
    });
  };

  const videoTemplates = Array.isArray(data.cardVideoTemplates)
    ? (data.cardVideoTemplates as string[])
    : [(data.cardVideoTemplate as string) || ""];

  const videoLimits = Array.isArray(data.cardVideoLimits)
    ? (data.cardVideoLimits as (number | string)[])
    : [data.videoLimit !== undefined ? (data.videoLimit as number | string) : 1];

  const handleVideoTemplatesChange = (newTemplates: string[], newLimits?: (number | string)[]) => {
    const limits = newLimits || [...videoLimits];
    while (limits.length < newTemplates.length) limits.push(1);
    if (limits.length > newTemplates.length) limits.length = newTemplates.length;

    update(nodeId, {
      cardVideoTemplates: newTemplates,
      cardVideoTemplate: newTemplates[0] || "",
      cardVideoLimits: limits,
      videoLimit: limits[0] !== undefined ? limits[0] : 1
    });
  };

  const insertKeyIntoTemplate = (key: string) => {
    const toInsert = `{{${key}}}`;

    if (activeInput.startsWith("cardImageTemplate") || activeInput.startsWith("cardVideoTemplate")) {
      const isVideo = activeInput.startsWith("cardVideoTemplate");
      let idx = 0;
      if (activeInput.includes("_")) {
        idx = parseInt(activeInput.split("_")[1], 10) || 0;
      }
      
      const currentTemplates = isVideo ? [...videoTemplates] : [...imageTemplates];
      while (currentTemplates.length <= idx) currentTemplates.push("");
      
      const currentImgVal = currentTemplates[idx] || "";
      if (currentImgVal === toInsert) {
        currentTemplates[idx] = "";
      } else {
        currentTemplates[idx] = toInsert;
      }
      if (isVideo) handleVideoTemplatesChange(currentTemplates);
      else handleImageTemplatesChange(currentTemplates);
      return;
    }

    const el = textareaRef.current;
    const currentVal = (data.cardTemplate as string) || "";

    if (currentVal.includes(toInsert)) {
      const newVal = currentVal.split(toInsert).join("");
      set({ cardTemplate: newVal });
      return;
    }

    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = currentVal.substring(0, start) + toInsert + currentVal.substring(end);
      set({ cardTemplate: newVal });
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + toInsert.length, start + toInsert.length);
      }, 0);
    } else {
      set({ cardTemplate: currentVal + toInsert });
    }
  };


  //  Raw API JSON preview state 
  const [showJson, setShowJson] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [rawJsonStatus, setRawJsonStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [rawJsonData, setRawJsonData] = useState<string>("");
  const [rawJsonError, setRawJsonError] = useState("");


  // WA Flow variable state 
  const [waFlowVars, setWaFlowVars] = useState<string[]>([]);
  const [waVarStatus, setWaVarStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const set = (patch: Record<string, unknown>) => update(nodeId, patch);



  // Load WA flow field names when waFlowIds change 
  useEffect(() => {
    if (waFlowIds.length === 0) { setWaFlowVars([]); return; }
    setWaVarStatus("loading");
    Promise.all(waFlowIds.map((id) => flowsApi.getFlowFields(id).then((r: any) => r.data?.fields ?? [])))
      .then((results) => {
        const merged = [...new Set((results as string[][]).flat())].sort();
        setWaFlowVars(merged);
        setWaVarStatus("ok");
      })
      .catch(() => setWaVarStatus("error"));
  }, [waFlowIds.join(",")]);



  // Fetch API keys 
  const fetchApiKeys = async () => {
    const url = (data.apiUrl as string || "").trim();
    if (!url) { setApiKeyError("Enter an API URL first."); setApiKeyStatus("error"); return; }
    setApiKeyStatus("loading");
    setApiKeyError("");
    try {
      const res: any = await flowsApi.previewListingApi(url, (data.resultsKey as string) || "");
      const keys: string[] = res.data?.keys ?? [];
      if (keys.length === 0) {
        setApiKeyError(res.data?.error || "No keys found. Check your URL and Results Key.");
        setApiKeyStatus("error");
      } else {
        setApiKeys(keys);
        setApiKeyStatus("ok");
      }
    } catch (e: any) {
      setApiKeyError(e?.response?.data?.error || "Request failed.");
      setApiKeyStatus("error");
    }
  };



  // Query parameter helpers
  const handleParamsChange = (next: ParamRow[]) => {
    setParams(next);
    const serialized = serializeParams(next);
    lastSerialized.current = JSON.stringify(serialized);
    update(nodeId, { queryParams: serialized });
  };

  const addParam = () => handleParamsChange([...params, { key: "", value: "" }]);
  const removeParam = (i: number) => handleParamsChange(params.filter((_, idx) => idx !== i));
  const updateParam = (i: number, field: "key" | "value", val: string) =>
    handleParamsChange(params.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));


  const insertVarIntoParam = (varName: string) => {
    if (!focusedParam) return;
    const { idx, field } = focusedParam;
    handleParamsChange(
      params.map((row, i) =>
        i === idx ? { ...row, [field]: (row[field] || "") + `{{${varName}}}` } : row
      )
    );
  };

  // All param-insertable variables = collect_input vars + WA flow fields
  const allParamVars = [...new Set([...flowVariables, ...waFlowVars])];

  // Track which param input is focused for the shared suggestion strip
  const [focusedParam, setFocusedParam] = useState<{ idx: number; field: "key" | "value" } | null>(null);


  // Fetch raw JSON from the listing API URL 
  const fetchRawJson = async () => {
    const url = (data.apiUrl as string || "").trim();
    if (!url) {
      setRawJsonError("Enter a Listing API URL first.");
      setRawJsonStatus("error");
      setShowJson(true);
      return;
    }
    setRawJsonStatus("loading");
    setRawJsonError("");
    setShowJson(true);
    try {
      const res = await fetch(url);
      const json = await res.json();
      setRawJsonData(JSON.stringify(json, null, 2));
      setRawJsonStatus("ok");
    } catch (e: any) {
      setRawJsonError(e?.message || "Failed to fetch URL.");
      setRawJsonStatus("error");
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJsonData);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end -mb-2">
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Instructions modal */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowInfo(false); }}
        >
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a2d3a]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#1e2130]">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-500" />
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">How to use Send Listing</span>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed max-h-[70vh] overflow-auto">
              <p>The <strong>Send Listing</strong> block paginates an array of items from your external API and sends them to the user as a WhatsApp interactive message.</p>

              <div>
                <strong className="text-slate-800 dark:text-slate-100 block mb-1">1. Listing API URL</strong>
                You can insert variables directly into the URL using <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{var}}"}</code>, or use Query Params below.
              </div>

              <div>
                <strong className="text-slate-800 dark:text-slate-100 block mb-1">2. Query Params</strong>
                Filter your API results based on user input. E.g. pass <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">location</code> = <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{location}}"}</code>.
                <br />
                <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                  Tip: To use variables from a WhatsApp Flow, make sure to add a WhatsApp Flow block to your canvas before this one!
                </span>
              </div>

              <div>
                <strong className="text-slate-800 dark:text-slate-100 block mb-1">3. Results Key (Optional)</strong>
                If your API returns a nested list like <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{`{ "data": { "rooms": [...] } }`}</code>, you must enter <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">data.rooms</code> so the system can find the array.
              </div>

              <div>
                <strong className="text-slate-800 dark:text-slate-100 block mb-1">4. Card Message Template</strong>
                Click the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{ }"}</code> button next to the API URL to load sample data. Once loaded, click "Get API Keys" to auto-discover the fields you can use in your template (like <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{name}}"}</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{price}}"}</code>).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw API JSON modal */}
      {showJson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowJson(false); }}
        >
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#0f1117", border: "1px solid #2a2d3a" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1e2130" }}>
              <div className="flex items-center gap-2">
                <Braces className="h-4 w-4 text-amber-400" />
                <span className="text-[12px] font-bold text-slate-200 tracking-wide">Listing API — Raw JSON Response</span>
              </div>
              <div className="flex items-center gap-2">
                {rawJsonStatus === "ok" && (
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                    style={jsonCopied ? { background: "#14532d", color: "#4ade80" } : { background: "#1e2130", color: "#94a3b8" }}
                  >
                    {jsonCopied ? <ClipboardCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {jsonCopied ? "Copied!" : "Copy"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowJson(false); setRawJsonStatus("idle"); }}
                  className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* URL pill */}
            <div className="px-4 py-2" style={{ borderBottom: "1px solid #1e2130", background: "#0a0c12" }}>
              <span className="text-[10px] font-mono text-amber-400/80 break-all">
                {(data.apiUrl as string) || "(no URL set)"}
              </span>
            </div>
            {/* Body */}
            <div className="overflow-auto" style={{ maxHeight: "55vh" }}>
              {rawJsonStatus === "loading" && (
                <div className="flex items-center justify-center gap-2 py-10">
                  <Loader className="h-4 w-4 text-amber-400 animate-spin" />
                  <span className="text-[11px] text-slate-400">Fetching…</span>
                </div>
              )}
              {rawJsonStatus === "error" && (
                <div className="flex items-center gap-2 px-4 py-6">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="text-[11px] text-rose-400">{rawJsonError}</span>
                </div>
              )}
              {rawJsonStatus === "ok" && (
                <pre className="text-[11px] leading-relaxed p-4 font-mono" style={{ color: "#6ee7b7" }}>
                  <code style={{ whiteSpace: "pre", wordBreak: "break-all" }}>
                    {rawJsonData}
                  </code>
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <FieldGroup label="Listing API URL *">
        <div className="flex gap-1.5 items-center">
          <div className="flex-1">
            <FieldInput
              value={(data.apiUrl as string) || ""}
              onChange={(e) => set({ apiUrl: e.target.value })}
              placeholder="https://yourapi.com/api/listings/"
              focus="focusAmber"
              mono
            />
          </div>
          <button
            type="button"
            onClick={fetchRawJson}
            title="Preview raw JSON response from this URL"
            disabled={rawJsonStatus === "loading"}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50"
            style={{ background: "#1e2130", borderColor: "#2a2d3a", color: "#f59e0b" }}
          >
            {rawJsonStatus === "loading" ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Braces className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </FieldGroup>

      {/* Query parameters section */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Query Params
          </span>
          <button
            type="button"
            onClick={addParam}
            className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Param
          </button>
        </div>

        {/* WA var loading indicator */}
        {waVarStatus === "loading" && (
          <div className="flex items-center gap-1 mb-1.5">
            <Loader className="h-2.5 w-2.5 text-violet-400 animate-spin" />
            <span className="text-[9px] text-violet-400">Loading WA flow variables…</span>
          </div>
        )}

        {params.length === 0 && (
          <p className="text-[10px] text-slate-400 italic py-1">
            No params yet — click "Add Param" to filter results.
          </p>
        )}

        <div className="space-y-2">
          {params.map((row, i) => (
            <div key={i} className="space-y-1">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <FieldInput
                    value={row.key}
                    onChange={(e) => updateParam(i, "key", e.target.value)}
                    placeholder="param name"
                    focus="focusAmber"
                    mono
                    onFocus={() => setFocusedParam({ idx: i, field: "key" })}
                    onBlur={() => setFocusedParam(null)}
                  />
                </div>
                <div className="flex-1">
                  <FieldInput
                    value={row.value}
                    onChange={(e) => updateParam(i, "value", e.target.value)}
                    placeholder="{{variable}} or value"
                    focus="focusAmber"
                    mono
                    onFocus={() => setFocusedParam({ idx: i, field: "value" })}
                    onBlur={() => setFocusedParam(null)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeParam(i)}
                  className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Single suggestion strip — shown once below all params */}
        {allParamVars.length > 0 && params.length > 0 && (
          <div className="mt-2 rounded border border-dashed border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-900/40 px-2 py-1.5 space-y-1">
            <p className="text-[9px] text-slate-400 dark:text-slate-500">
              {focusedParam
                ? <>Inserting into <span className="font-bold text-amber-500">param {focusedParam.idx + 1} {focusedParam.field === "value" ? "value" : "key"}</span> — click to insert:</>
                : "Focus a param input above, then click a variable to insert it"}
            </p>
            <div className="flex flex-wrap gap-1">
              {allParamVars.map((v) => (
                <button
                  key={v}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertVarIntoParam(v); }}
                  className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all select-none ${
                    focusedParam
                      ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 cursor-pointer"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-default"
                  }`}
                  title={focusedParam ? `Insert {{${v}}}` : "Focus a param input first"}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <FieldGroup label="Results Key (Optional)">
        <FieldInput
          value={(data.resultsKey as string) || ""}
          onChange={(e) => set({ resultsKey: e.target.value })}
          placeholder="e.g.  results  or  data.rooms"
          focus="focusAmber"
          mono
        />
      </FieldGroup>

      {/* Max results to show */}
      <FieldGroup label="Results Per Page">
        <FieldInput
          type="number"
          min={1}
          max={20}
          value={data.maxResults === undefined ? 1 : (data.maxResults as any)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              set({ maxResults: "" });
              return;
            }
            let val = parseInt(raw, 10);
            if (!isNaN(val)) {
              if (val > 20) val = 20;
              if (val < 1) val = 1;
              set({ maxResults: val });
            }
          }}
          focus="focusAmber"
        />
        <div className="mt-1.5 text-xs text-slate-500 font-medium">
          Note: WhatsApp will send each result as a separate message bubble. Sending more than 5 at a time may annoy users or trigger spam limits.
        </div>
      </FieldGroup>

      {/* Card Image Templates */}
      <FieldGroup
        label={
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.enableImages !== false}
                onChange={(e) => set({ enableImages: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a1f2e] text-amber-500 focus:ring-amber-500/20"
              />
              <span className={data.enableImages === false ? "opacity-50" : ""}>Enable Images & Albums</span>
            </label>
            {data.enableImages !== false && (
              <button
                type="button"
                onClick={() => handleImageTemplatesChange([...imageTemplates, ""])}
                className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Image
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-2">
          {imageTemplates.map((template, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <FieldInput
                disabled={data.enableImages === false}
                value={template}
                onChange={(e) => {
                  const newTemplates = [...imageTemplates];
                  newTemplates[idx] = e.target.value;
                  handleImageTemplatesChange(newTemplates, imageLimits);
                }}
                onFocus={() => setActiveInput(`cardImageTemplate_${idx}`)}
                placeholder={`e.g. {{image_${idx + 1}}}`}
                focus="focusAmber"
                mono
                className="flex-1 min-w-0"
              />
              
              {data.enableImages !== false && (
                <>
                  <FieldInput
                    type="number"
                    value={imageLimits[idx] === undefined ? "" : imageLimits[idx]}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newLimits = [...imageLimits];
                      if (val === "") {
                        newLimits[idx] = "";
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) newLimits[idx] = Math.max(1, parsed);
                      }
                      handleImageTemplatesChange(imageTemplates, newLimits);
                    }}
                    title="Maximum images for this field"
                    className="!w-16 flex-none text-center !py-1.5 !text-xs"
                    placeholder="Limit"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx > 0) {
                          const newTemplates = [...imageTemplates];
                          [newTemplates[idx - 1], newTemplates[idx]] = [newTemplates[idx], newTemplates[idx - 1]];
                          const newLimits = [...imageLimits];
                          [newLimits[idx - 1], newLimits[idx]] = [newLimits[idx], newLimits[idx - 1]];
                          handleImageTemplatesChange(newTemplates, newLimits);
                        }
                      }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-amber-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx < imageTemplates.length - 1) {
                          const newTemplates = [...imageTemplates];
                          [newTemplates[idx + 1], newTemplates[idx]] = [newTemplates[idx], newTemplates[idx + 1]];
                          const newLimits = [...imageLimits];
                          [newLimits[idx + 1], newLimits[idx]] = [newLimits[idx], newLimits[idx + 1]];
                          handleImageTemplatesChange(newTemplates, newLimits);
                        }
                      }}
                      disabled={idx === imageTemplates.length - 1}
                      className="p-1 text-slate-400 hover:text-amber-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTemplates = imageTemplates.filter((_, i) => i !== idx);
                        const newLimits = imageLimits.filter((_, i) => i !== idx);
                        if (newTemplates.length === 0) {
                          newTemplates.push("");
                          newLimits.push(4);
                        }
                        handleImageTemplatesChange(newTemplates, newLimits);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          <div className="flex items-center justify-between mt-1">
            {data.enableImages !== false && (
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Click a field, then select an image key from API Response below.
              </div>
            )}
          </div>
        </div>
      </FieldGroup>

      {/* Card Video Templates */}
      <FieldGroup
        label={
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.enableVideos === true}
                onChange={(e) => set({ enableVideos: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a1f2e] text-indigo-500 focus:ring-indigo-500/20"
              />
              <span className={data.enableVideos !== true ? "opacity-50" : ""}>Enable Videos</span>
            </label>
            {data.enableVideos === true && (
              <button
                type="button"
                onClick={() => handleVideoTemplatesChange([...videoTemplates, ""])}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Video
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-2">
          {videoTemplates.map((template, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <FieldInput
                disabled={data.enableVideos !== true}
                value={template}
                onChange={(e) => {
                  const newTemplates = [...videoTemplates];
                  newTemplates[idx] = e.target.value;
                  handleVideoTemplatesChange(newTemplates, videoLimits);
                }}
                onFocus={() => setActiveInput(`cardVideoTemplate_${idx}`)}
                placeholder={`e.g. {{video_${idx + 1}}}`}
                focus="focusIndigo"
                mono
                className="flex-1 min-w-0"
              />
              
              {data.enableVideos === true && (
                <>
                  <FieldInput
                    type="number"
                    value={videoLimits[idx] === undefined ? "" : videoLimits[idx]}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newLimits = [...videoLimits];
                      if (val === "") {
                        newLimits[idx] = "";
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) newLimits[idx] = Math.max(1, parsed);
                      }
                      handleVideoTemplatesChange(videoTemplates, newLimits);
                    }}
                    title="Maximum videos for this field"
                    className="!w-16 flex-none text-center !py-1.5 !text-xs"
                    placeholder="Limit"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx > 0) {
                          const newTemplates = [...videoTemplates];
                          [newTemplates[idx - 1], newTemplates[idx]] = [newTemplates[idx], newTemplates[idx - 1]];
                          const newLimits = [...videoLimits];
                          [newLimits[idx - 1], newLimits[idx]] = [newLimits[idx], newLimits[idx - 1]];
                          handleVideoTemplatesChange(newTemplates, newLimits);
                        }
                      }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx < videoTemplates.length - 1) {
                          const newTemplates = [...videoTemplates];
                          [newTemplates[idx + 1], newTemplates[idx]] = [newTemplates[idx], newTemplates[idx + 1]];
                          const newLimits = [...videoLimits];
                          [newLimits[idx + 1], newLimits[idx]] = [newLimits[idx], newLimits[idx + 1]];
                          handleVideoTemplatesChange(newTemplates, newLimits);
                        }
                      }}
                      disabled={idx === videoTemplates.length - 1}
                      className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTemplates = videoTemplates.filter((_, i) => i !== idx);
                        const newLimits = videoLimits.filter((_, i) => i !== idx);
                        if (newTemplates.length === 0) {
                          newTemplates.push("");
                          newLimits.push(1);
                        }
                        handleVideoTemplatesChange(newTemplates, newLimits);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          <div className="flex items-center justify-between mt-1">
            {data.enableVideos === true && (
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Click a field, then select a video key from API Response below.
              </div>
            )}
          </div>
        </div>
      </FieldGroup>

      {/* Card template section */}
      <FieldGroup label="Card Message Template *">
        <FieldTextarea
          ref={textareaRef}
          onFocus={() => setActiveInput("cardTemplate")}
          value={(data.cardTemplate as string) || ""}
          onChange={(e) => set({ cardTemplate: e.target.value })}
          placeholder={apiKeyStatus === "ok" ? CARD_TEMPLATE_PLACEHOLDER : "Click \"Get API Keys\" above to load available fields, then build your template here…"}
          rows={7}
          focus="focusAmber"
        />

        {/* Get Keys button */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={fetchApiKeys}
            disabled={apiKeyStatus === "loading"}
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors disabled:opacity-60"
          >
            {apiKeyStatus === "loading" ? (
              <Loader className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {apiKeyStatus === "ok" ? "Refresh Keys" : "Get API Keys"}
          </button>
          {apiKeyStatus === "ok" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="h-3 w-3" /> {apiKeys.length} fields found
            </span>
          )}
          {apiKeyStatus === "error" && (
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
              <AlertCircle className="h-3 w-3" /> {apiKeyError}
            </span>
          )}
        </div>

        {/* API Keys chips — shown only after Get Keys succeeds */}
        {apiKeyStatus === "ok" && apiKeys.length > 0 && (
          <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">API Response Fields</span>
              <span className="text-[9px] text-emerald-500 ml-auto">use in card template ↑</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {["__index", "__total"].map((v) => {
                const isSelected = ((data.cardTemplate as string) || "").includes(`{{${v}}}`);
                return (
                  <button
                    key={v}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insertKeyIntoTemplate(v); }}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors flex items-center gap-1.5 border ${isSelected
                      ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 dark:bg-amber-600 dark:border-amber-500 dark:hover:bg-amber-700"
                      : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800/80"
                      }`}
                    title={isSelected ? `Remove {{${v}}}` : `Insert {{${v}}}`}
                  >
                    {isSelected && <CheckCircle className="w-2.5 h-2.5 opacity-90" />}
                    {`{{${v}}}`}
                  </button>
                );
              })}
            </div>

            <div className="max-h-56 overflow-y-auto pr-2 pb-2">
              {Object.entries(buildTree(apiKeys)).map(([name, node]) => (
                <KeyNode
                  key={name}
                  name={name}
                  node={node}
                  fullPath={name}
                  onInsert={insertKeyIntoTemplate}
                  templateText={(data.cardTemplate as string) || ""}
                />
              ))}
            </div>

            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 mt-2">
              Click a field to insert it. Click it again to remove it.
            </p>
          </div>
        )}
      </FieldGroup>

      {/* Interactive button labels */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Button Labels
        </span>
        <div className="grid grid-cols-3 gap-2">
          <FieldGroup
            label={
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.enableNext !== false}
                  onChange={(e) => set({ enableNext: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a1f2e] text-amber-500 focus:ring-amber-500/20"
                />
                <span className={data.enableNext === false ? "opacity-50" : ""}>Next</span>
              </label>
            }
          >
            <FieldInput
              value={(data.nextLabel as string) || "Next"}
              onChange={(e) => set({ nextLabel: e.target.value })}
              placeholder="Next"
              focus="focusAmber"
              disabled={data.enableNext === false}
            />
          </FieldGroup>
          <FieldGroup
            label={
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.enableBook !== false}
                  onChange={(e) => set({ enableBook: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a1f2e] text-amber-500 focus:ring-amber-500/20"
                />
                <span className={data.enableBook === false ? "opacity-50" : ""}>Book</span>
              </label>
            }
          >
            <FieldInput
              value={(data.bookLabel as string) || "Book Now"}
              onChange={(e) => set({ bookLabel: e.target.value })}
              placeholder="Book Now"
              focus="focusAmber"
              disabled={data.enableBook === false}
            />
          </FieldGroup>
          <FieldGroup
            label={
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.enableExit !== false}
                  onChange={(e) => set({ enableExit: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a1f2e] text-amber-500 focus:ring-amber-500/20"
                />
                <span className={data.enableExit === false ? "opacity-50" : ""}>Exit</span>
              </label>
            }
          >
            <FieldInput
              value={(data.exitLabel as string) || "Exit"}
              onChange={(e) => set({ exitLabel: e.target.value })}
              placeholder="Exit"
              focus="focusAmber"
              disabled={data.enableExit === false}
            />
          </FieldGroup>
        </div>
      </div>

      {/* Fallback messages */}
      <FieldGroup label="No Results Message">
        <FieldInput
          value={(data.noResultsMessage as string) || ""}
          onChange={(e) => set({ noResultsMessage: e.target.value })}
          placeholder="Sorry, no results found matching your criteria."
          focus="focusAmber"
        />
      </FieldGroup>

      <FieldGroup label="No More Results Message">
        <FieldInput
          value={(data.noMoreMessage as string) || ""}
          onChange={(e) => set({ noMoreMessage: e.target.value })}
          placeholder="You've seen all available results."
          focus="focusAmber"
        />
      </FieldGroup>

    </div>
  );
}

export default SendListingPanel;
