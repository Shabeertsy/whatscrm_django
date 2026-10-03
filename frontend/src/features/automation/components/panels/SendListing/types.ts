export interface SendListingProps {
  nodeId: string;
  data: Record<string, unknown>;
  update: (id: string, patch: Record<string, unknown>) => void;
  flowVariables?: string[];
  waFlowIds?: string[];
}

export type ParamRow = { key: string; value: string };

export type TreeNode = {
  [key: string]: TreeNode | null;
};

export interface KeyNodeProps {
  name: string;
  node: TreeNode | null;
  fullPath: string;
  onInsert: (k: string) => void;
  templateText: string;
}
