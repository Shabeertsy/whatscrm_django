/**
 *
 * Every node type is defined here ONCE. All other modules derive from this:
 *   - NODE_TYPES       
 *   - INITIAL_DATA     
 *   - TYPE_ALIASES     
 *   - Sidebar items    (SidebarElements.tsx)
 *
 * Adding a new node = add one entry here only.
 */

import {
  MessageSquare, Image as ImageIcon, Menu, SplitSquareHorizontal, Clock, XCircle, FileInput, Save,
  Sparkles, Globe, Zap, LucideIcon,
} from "lucide-react";


import TriggerNode from "../components/nodes/TriggerNode";
import SendMessageNode from "../components/nodes/SendMessageNode";
import WaitNode from "../components/nodes/WaitNode";
import ConditionNode from "../components/nodes/ConditionNode";
import MenuNode from "../components/nodes/MenuNode";
import EndChatNode from "../components/nodes/EndChatNode";
import CollectInputNode from "../components/nodes/CollectInputNode";
import SaveContactNode from "../components/nodes/SaveContactNode";
import AiControlNode from "../components/nodes/AiControlNode";
import HttpRequestNode from "../components/nodes/HttpRequestNode";
import DeletableEdge from "../components/DeletableEdge";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalType =
  | "trigger"
  | "action"
  | "wait"
  | "condition"
  | "menu"
  | "end_chat"
  | "collect_input"
  | "save_contact"
  | "ai_control"
  | "http_request";

export interface NodeRegistryEntry {
  /** ReactFlow component */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  /** Human-readable label shown in the sidebar */
  label: string;
  /** Short helper text shown under the label */
  description: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** Tailwind colour class for the icon */
  color: string;
  /** Sidebar category */
  category: "Triggers" | "Messages" | "Logic & Flow" | "Data & Actions";
  /** All string aliases that resolve to this canonical type */
  aliases: string[];
  /** Default canvas drop size */
  defaultWidth: number;
  defaultHeight: number;
  /** Factory: returns a fresh default config (uses crypto.randomUUID per call) */
  defaultConfig: (title: string, desc: string) => Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_REGISTRY: Record<CanonicalType, NodeRegistryEntry> = {

  trigger: {
    component: TriggerNode,
    label: "Start Trigger",
    description: "Start flow on event or message",
    icon: Zap,
    color: "text-purple-500",
    category: "Triggers",
    aliases: ["trigger"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      triggerType: "inbound_message",
      keywords: [],
    }),
  },

  action: {
    component: SendMessageNode,
    label: "Send Message",
    description: "Send a text message to user",
    icon: MessageSquare,
    color: "text-emerald-500",
    category: "Messages",
    aliases: ["action"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      message: "Hello! Thank you for reaching out.",
    }),
  },

  wait: {
    component: WaitNode,
    label: "Delay",
    description: "Wait for a specified time",
    icon: Clock,
    color: "text-blue-500",
    category: "Logic & Flow",
    aliases: ["wait", "delay"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      delayValue: 5,
      delayUnit: "minutes",
    }),
  },

  condition: {
    component: ConditionNode,
    label: "Condition Split",
    description: "Branch flow based on data",
    icon: SplitSquareHorizontal,
    color: "text-amber-500",
    category: "Logic & Flow",
    aliases: ["condition"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      conditions: [],
    }),
  },

  menu: {
    component: MenuNode,
    label: "Menu Options",
    description: "Interactive button menu",
    icon: Menu,
    color: "text-orange-500",
    category: "Messages",
    aliases: ["menu", "Menu Options"],
    defaultWidth: 220,
    defaultHeight: 260,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      message: "Please choose an option from the menu below:",
      invalidOptionMessage: "Invalid option. Please select a valid number from the menu above.",
      noMatchMessage: "Invalid option. Please select a valid number from the menu above.",
      // IDs generated fresh per call — no stale module-level timestamp
      options: [
        { id: crypto.randomUUID(), label: "Option 1", value: "1" },
        { id: crypto.randomUUID(), label: "Option 2", value: "2" },
      ],
    }),
  },

  end_chat: {
    component: EndChatNode,
    label: "End Chat",
    description: "Close the active conversation",
    icon: XCircle,
    color: "text-rose-500",
    category: "Logic & Flow",
    aliases: ["end_chat", "endChat", "End Chat"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      closingMessage: "Thank you for chatting with us. Goodbye!",
    }),
  },

  collect_input: {
    component: CollectInputNode,
    label: "Collect Input",
    description: "Ask for and save user input",
    icon: FileInput,
    color: "text-purple-500",
    category: "Data & Actions",
    aliases: ["collect_input", "collectInput", "Collect Input"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      prompt: "Please enter your details:",
      variableName: "",
      validationType: "text",
      maxRetries: 3,
    }),
  },

  save_contact: {
    component: SaveContactNode,
    label: "Save Contact",
    description: "Update CRM contact details",
    icon: Save,
    color: "text-emerald-500",
    category: "Data & Actions",
    aliases: ["save_contact", "saveContact", "Save Contact"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      fieldToUpdate: "name",
      fieldValue: "{{user_input}}",
      tagToAdd: "",
    }),
  },

  ai_control: {
    component: AiControlNode,
    label: "AI Control",
    description: "Handover to AI Agent",
    icon: Sparkles,
    color: "text-indigo-400",
    category: "Data & Actions",
    aliases: ["ai_control", "aiControl", "AI Control"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      aiAction: "enable_ai",
      systemInstructions: "",
    }),
  },

  http_request: {
    component: HttpRequestNode,
    label: "HTTP Request",
    description: "Trigger external webhook",
    icon: Globe,
    color: "text-amber-500",
    category: "Data & Actions",
    aliases: ["http_request", "httpRequest", "HTTP Request"],
    defaultWidth: 220,
    defaultHeight: 100,
    defaultConfig: (title, desc) => ({
      version: 1,
      title,
      description: desc,
      httpMethod: "POST",
      url: "https://api.example.com/webhook",
      headers: "{}",
      requestBody: '{\n  "phone": "{{phone}}"\n}',
      responseVariable: "api_response",
    }),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers (consumed by SidebarElements.tsx and FlowCanvas.tsx)
// ─────────────────────────────────────────────────────────────────────────────

/** ReactFlow nodeTypes map — memoised in FlowCanvas via useMemo */
export const NODE_TYPES = Object.fromEntries(
  Object.entries(NODE_REGISTRY).map(([k, v]) => [k, v.component])
) as any;

/** ReactFlow edgeTypes map */
export const EDGE_TYPES = {
  default: DeletableEdge,
  deletable: DeletableEdge,
} as const;

/** Flat alias → canonical type lookup map */
export const TYPE_ALIASES: Record<string, CanonicalType> = Object.fromEntries(
  (Object.entries(NODE_REGISTRY) as [CanonicalType, NodeRegistryEntry][]).flatMap(
    ([canonical, entry]) => entry.aliases.map((alias) => [alias, canonical])
  )
);

/** Resolve any incoming type/title string to a canonical type */
export function resolveNodeType(type: string, title: string): CanonicalType {
  return TYPE_ALIASES[type] ?? TYPE_ALIASES[title] ?? (type as CanonicalType);
}

/** Get fresh default config for a dropped node */
export function getInitialData(type: string, title: string, desc: string) {
  const canonical = resolveNodeType(type, title);
  const entry = NODE_REGISTRY[canonical];
  return entry ? entry.defaultConfig(title, desc) : { version: 1, title, description: desc };
}

/** Sidebar category groups derived from the registry */
export type SidebarCategory = "Triggers" | "Messages" | "Logic & Flow" | "Data & Actions";

export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  "Triggers",
  "Messages",
  "Logic & Flow",
  "Data & Actions",
];

export interface SidebarItem {
  type: CanonicalType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

/** Sidebar items grouped by category, derived from the registry */
export const SIDEBAR_ITEMS: Record<SidebarCategory, SidebarItem[]> = (() => {
  const result = {} as Record<SidebarCategory, SidebarItem[]>;
  for (const cat of SIDEBAR_CATEGORIES) result[cat] = [];
  for (const [type, entry] of Object.entries(NODE_REGISTRY) as [CanonicalType, NodeRegistryEntry][]) {
    result[entry.category].push({
      type,
      label: entry.label,
      description: entry.description,
      icon: entry.icon,
      color: entry.color,
    });
  }
  return result;
})();
