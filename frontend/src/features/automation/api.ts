import { Node, Edge } from "@xyflow/react";

export interface Flow {
  id: string;
  name: string;
  description?: string;
  status?: string;
  instances?: string[];
  instances_detail?: Array<{ id: string; display_name: string }>;
  nodes: Node[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
}
