import React from "react";
import { FieldGroup, FieldSelect, FieldInput } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function TriggerPanel({ nodeId, data, update }: Props) {
  const triggerType = (data.triggerType as string) || "inbound_message";

  return (
    <div className="space-y-4">
      <FieldGroup label="Trigger Event">
        <FieldSelect
          value={triggerType}
          onChange={(e) => update(nodeId, { triggerType: e.target.value })}
          focus="focusGreen"
        >
          <option value="inbound_message">Incoming Chat Message</option>
          <option value="keyword">Keyword Match</option>
          <option value="new_contact">New Contact Created</option>
          <option value="webhook">External Webhook Event</option>
        </FieldSelect>
      </FieldGroup>

      {triggerType === "keyword" && (
        <>
          <FieldGroup label="Match Type">
            <FieldSelect
              value={(data.matchType as string) || "contains"}
              onChange={(e) => update(nodeId, { matchType: e.target.value })}
              focus="focusGreen"
            >
              <option value="contains">Contains</option>
              <option value="exact">Exact Match</option>
            </FieldSelect>
          </FieldGroup>

          <FieldGroup label="Keywords (comma separated)">
            <FieldInput
              value={(data.keywordsRaw as string) ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const arr = raw.split(",").map(k => k.trim()).filter(Boolean);
                update(nodeId, { keywordsRaw: raw, keywords: arr });
              }}
              placeholder="e.g. start, hello"
              focus="focusGreen"
            />
          </FieldGroup>
        </>
      )}
    </div>
  );
}
