import React from "react";
import { FieldGroup, FieldTextarea } from "../ui/FormFields";

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
}

export function EndChatPanel({ nodeId, data, update }: Props) {
  return (
    <FieldGroup label="Closing Message (Optional)">
      <FieldTextarea
        value={(data.closingMessage as string) || (data.message as string) || ""}
        onChange={(e) =>
          update(nodeId, {
            closingMessage: e.target.value,
            message: e.target.value,
          })
        }
        placeholder="Enter message sent when conversation ends..."
        rows={3}
        focus="focusRose"
      />
    </FieldGroup>
  );
}
