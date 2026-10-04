export interface Mindmap {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
}

export interface NodePropertyValue {
  propertyDefinitionId: number;
  value: unknown;
}

export interface TreeNode {
  id: number;
  parentId: number | null;
  title: string;
  orderIndex: number;
  collapsed: boolean;
  color: string | null;
  hasPage: boolean;
  todoTotal: number;
  todoDone: number;
  propertyValues: NodePropertyValue[];
}

export interface NodeDetail extends TreeNode {
  mindmapId: number;
  pageContent: object | null;
}
