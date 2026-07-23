import React from "react";
import { FieldGroup, FieldTextarea, FieldInput, FieldSelect } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function CollectInputPanel({ nodeId, data, update }: Props) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Prompt Question / Message">
        <FieldTextarea
          value={(data.prompt as string) || (data.message as string) || ""}
          onChange={(e) =>
            update(nodeId, { prompt: e.target.value, message: e.target.value })
          }
          placeholder="Question asked to user (e.g. Please enter your email:)"
          rows={2}
          focus="focusPurple"
        />
      </FieldGroup>

      <FieldGroup label="Save to Variable Name">
        <FieldInput
          type="text"
          value={(data.variableName as string) || "user_input"}
          onChange={(e) => update(nodeId, { variableName: e.target.value })}
          placeholder="e.g. user_email, full_name"
          focus="focusPurple"
          mono
        />
      </FieldGroup>

      <FieldGroup label="Validation / Input Type">
        <FieldSelect
          value={(data.validationType as string) || "text"}
          onChange={(e) => update(nodeId, { validationType: e.target.value })}
          focus="focusPurple"
        >
          <option value="text">Any Text</option>
          <option value="email">Email Address</option>
          <option value="number">Number</option>
          <option value="phone">Phone Number</option>
        </FieldSelect>
      </FieldGroup>

      <FieldGroup label="Validation Error Message (Optional)">
        <FieldInput
          type="text"
          value={(data.errorMessage as string) || ""}
          onChange={(e) => update(nodeId, { errorMessage: e.target.value })}
          placeholder="e.g. Please enter a valid email address."
          focus="focusPurple"
        />
      </FieldGroup>
    </div>
  );
}
