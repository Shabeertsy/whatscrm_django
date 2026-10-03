import { ParamRow, TreeNode } from "./types";



export function parseParams(raw: unknown): ParamRow[] {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, string>).map(([key, value]) => ({ key, value }));
  }
  return [];
}


export function serializeParams(rows: ParamRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key, r.value]));
}


export function buildTree(keys: string[]): TreeNode {
  const root: TreeNode = {};
  for (const key of keys) {
    const parts = key.split(".");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        current[part] = current[part] || {};
        current = current[part] as TreeNode;
      }
    }
  }
  return root;
}
