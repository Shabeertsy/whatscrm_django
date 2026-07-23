import React from "react";
import { FieldGroup, FieldSelect, FieldTextarea } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function AiControlPanel({ nodeId, data, update }: Props) {
  return (
    <div className="space-y-4">
      <FieldGroup label="AI Action Mode">
        <FieldSelect
          value={(data.aiAction as string) || "enable_ai"}
          onChange={(e) => update(nodeId, { aiAction: e.target.value })}
          focus="focusIndigo"
        >
          <option value="enable_ai">Handover to AI Agent</option>
          <option value="disable_ai">Pause / Disable AI Agent</option>
        </FieldSelect>
      </FieldGroup>

      <FieldGroup label="System Instructions / Prompt (Optional)">
        <FieldTextarea
          value={(data.systemInstructions as string) || ""}
          onChange={(e) => update(nodeId, { systemInstructions: e.target.value })}
          placeholder="Specific instructions for AI agent in this flow..."
          rows={3}
          focus="focusIndigo"
        />
      </FieldGroup>
    </div>
  );
}
