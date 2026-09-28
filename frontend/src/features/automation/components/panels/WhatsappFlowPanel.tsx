import React, { useState, useEffect } from "react";
import { FieldGroup, FieldInput, FieldSelect } from "../ui/FormFields";
import { apiClient } from "../../../../api/client";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function WhatsappFlowPanel({ nodeId, data, update }: Props) {
  const [flows, setFlows] = useState<Array<{ id: string, name: string, status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available WhatsApp flows
    const fetchFlows = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/flows/"); // Adjust endpoint if necessary
        // The API might return an array or a paginated response { results: [] }
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setFlows(data);
      } catch (err) {
        console.error("Failed to fetch WhatsApp flows", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlows();
  }, []);

  return (
    <div className="space-y-4">
      <FieldGroup label="Select WhatsApp Flow">
        {loading ? (
          <div className="text-xs text-slate-500 py-2">Loading flows...</div>
        ) : flows.length === 0 ? (
          <div className="text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
            No flows found. Please create a WhatsApp Flow first.
          </div>
        ) : (
          <FieldSelect
            value={(data.flowId as string) || ""}
            onChange={(e) => update(nodeId, { flowId: e.target.value })}
            focus="focusGreen"
          >
            <option value="">-- Select a Flow --</option>
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.status})
              </option>
            ))}
          </FieldSelect>
        )}
      </FieldGroup>

      <FieldGroup label="Call-to-Action Button Text">
        <FieldInput
          value={(data.ctaLabel as string) || ""}
          onChange={(e) => update(nodeId, { ctaLabel: e.target.value })}
          placeholder="e.g. Open Form"
          focus="focusGreen"
        />
      </FieldGroup>
    </div>
  );
}

export default WhatsappFlowPanel;
