import type { Node } from '@xyflow/react';
import type { NodeStatus } from '@/modules/mindmap/mindmaps/types';
import type { NodeChip } from './chips';

export type MindNodeData = {
  chips: NodeChip[];
  nodeId: number;
  mindmapId: number;
  title: string;
  color: string;
  isRoot: boolean;
  collapsed: boolean;
  hasPage: boolean;
  status: NodeStatus | null;
  descendants: number;
  todoDone: number;
  todoTotal: number;
  editing: boolean;
  onCommitTitle: (nodeId: number, title: string) => void;
  onCancelEdit: () => void;
  onToggleCollapse: (nodeId: number, collapsed: boolean) => void;
};

export type MindFlowNode = Node<MindNodeData, 'mindNode'>;
