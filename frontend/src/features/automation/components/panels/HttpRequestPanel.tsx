import React from "react";
import { FieldGroup, FieldSelect, FieldInput, FieldTextarea } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function HttpRequestPanel({ nodeId, data, update }: Props) {
  return (
    <div className="space-y-4">
      <FieldGroup label="HTTP Method">
        <FieldSelect
          value={(data.httpMethod as string) || "POST"}
          onChange={(e) => update(nodeId, { httpMethod: e.target.value })}
          focus="focusAmber"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </FieldSelect>
      </FieldGroup>

      <FieldGroup label="Request URL / Endpoint">
        <FieldInput
          type="text"
          value={(data.url as string) || ""}
          onChange={(e) => update(nodeId, { url: e.target.value })}
          placeholder="https://api.example.com/v1/webhook"
          focus="focusAmber"
          mono
        />
      </FieldGroup>

      <FieldGroup label="Request Headers (Optional)">
        <FieldInput
          type="text"
          value={(data.headers as string) || ""}
          onChange={(e) => update(nodeId, { headers: e.target.value })}
          placeholder="e.g. Authorization: Bearer token"
          focus="focusAmber"
          mono
        />
      </FieldGroup>

      <FieldGroup label="Payload / Request Body (JSON, Optional)">
        <FieldTextarea
          value={(data.requestBody as string) || ""}
          onChange={(e) => update(nodeId, { requestBody: e.target.value })}
          placeholder={'{\n  "phone": "{{phone}}",\n  "name": "{{user_name}}"\n}'}
          rows={3}
          focus="focusAmber"
        />
      </FieldGroup>

      <FieldGroup label="Save Response to Variable (Optional)">
        <FieldInput
          type="text"
          value={(data.responseVariable as string) || ""}
          onChange={(e) => update(nodeId, { responseVariable: e.target.value })}
          placeholder="e.g. api_response, status"
          focus="focusAmber"
          mono
        />
      </FieldGroup>
    </div>
  );
}
