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

/** Trạng thái hành động; null = không theo dõi. */
export type NodeStatus = 'todo' | 'doing' | 'done';

export const STATUS_LABELS: Record<NodeStatus, string> = {
  todo: 'Chưa làm',
  doing: 'Đang làm',
  done: 'Xong',
};

export interface TreeNode {
  id: number;
  parentId: number | null;
  title: string;
  orderIndex: number;
  collapsed: boolean;
  color: string | null;
  status: NodeStatus | null;
  hasPage: boolean;
  todoTotal: number;
  todoDone: number;
  propertyValues: NodePropertyValue[];
}

export interface NodeDetail extends TreeNode {
  mindmapId: number;
  pageContent: object | null;
}
