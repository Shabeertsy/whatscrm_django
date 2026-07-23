import { Node, Edge } from "@xyflow/react";

export interface Flow {
  id: string;
  name: string;
  description?: string;
  status?: string;
  nodes: Node[];
  edges: Edge[];
}
