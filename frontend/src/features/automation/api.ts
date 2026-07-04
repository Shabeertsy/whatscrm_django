import { Node, Edge } from "@xyflow/react";

export interface Flow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

export const initialFlows: Flow[] = [
  {
    id: "f1",
    name: "Welcome Automation",
    nodes: [
      {
        id: "n1",
        type: "trigger",
        position: { x: 50, y: 150 },
        data: { title: "Start Trigger", description: "Incoming Chat Message" }
      },
      {
        id: "n2",
        type: "condition",
        position: { x: 350, y: 150 },
        data: { title: "Condition Split", description: "Check if new user" }
      },
      {
        id: "n3",
        type: "action",
        position: { x: 700, y: 100 },
        data: { title: "Send Greeting", description: "Welcome message" }
      }
    ],
    edges: [
      { id: "e1-2", source: "n1", target: "n2" },
      { id: "e2-3", source: "n2", sourceHandle: "true", target: "n3" }
    ]
  }
];
