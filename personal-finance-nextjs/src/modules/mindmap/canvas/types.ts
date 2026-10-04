import type { Node } from '@xyflow/react';
import type { NodeStatus } from '@/modules/mindmap/mindmaps/types';
import type { NodeChip } from './chips';
import type { NodeSide } from './layout';

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
  /** Phía so với nút gốc (bố cục 2 bên): quyết định điểm nối cạnh và vị trí nút thu gọn. */
  side: NodeSide;
  /** Nhánh này đang là nguồn của liên kết sắp tạo. */
  linkSource: boolean;
  onCommitTitle: (nodeId: number, title: string) => void;
  onCancelEdit: () => void;
  onToggleCollapse: (nodeId: number, collapsed: boolean) => void;
  onStartLink: (nodeId: number) => void;
};

export type MindFlowNode = Node<MindNodeData, 'mindNode'>;
