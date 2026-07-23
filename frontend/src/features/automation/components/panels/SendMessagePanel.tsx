import React from "react";
import { FieldGroup, FieldTextarea, FieldInput, FieldSelect } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function SendMessagePanel({ nodeId, data, update }: Props) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Message Text">
        <FieldTextarea
          value={(data.message as string) || ""}
          onChange={(e) => update(nodeId, { message: e.target.value })}
          placeholder="Enter message to send to user..."
          rows={3}
          focus="focusGreen"
        />
      </FieldGroup>
      
      <FieldGroup label="Media Type (Optional)">
        <FieldSelect
          value={(data.mediaType as string) || ""}
          onChange={(e) => update(nodeId, { mediaType: e.target.value })}
          focus="focusGreen"
        >
          <option value="">None</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
          <option value="audio">Audio</option>
        </FieldSelect>
      </FieldGroup>

      {data.mediaType && (
        <>
          <FieldGroup label="Media URL">
            <FieldInput
              value={(data.mediaUrl as string) || ""}
              onChange={(e) => update(nodeId, { mediaUrl: e.target.value })}
              placeholder="https://example.com/file..."
              focus="focusGreen"
            />
          </FieldGroup>
          <FieldGroup label="Media File Name">
            <FieldInput
              value={(data.mediaName as string) || ""}
              onChange={(e) => update(nodeId, { mediaName: e.target.value })}
              placeholder="e.g. document.pdf"
              focus="focusGreen"
            />
          </FieldGroup>
        </>
      )}
    </div>
  );
}
