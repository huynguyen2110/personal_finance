import type { Node } from '@xyflow/react';
import type { NodeStatus } from '@/modules/mindmap/mindmaps/types';
import type { NodeSide } from './layout';
import type { NodeRoleMeta } from './nodeMeta';

/** root = nút gốc, area = lĩnh vực (cấp 1), action = hành động (cấp ≥ 2). */
export type NodeKind = 'root' | 'area' | 'action';

export type MindNodeData = {
  nodeId: number;
  mindmapId: number;
  kind: NodeKind;
  title: string;
  color: string;
  collapsed: boolean;
  hasPage: boolean;
  status: NodeStatus | null;
  descendants: number;
  todoDone: number;
  todoTotal: number;
  meta: NodeRoleMeta;
  /** Tên các điều kiện trước chưa xong. */
  blockedBy: string[];
  /** Số việc chưa xong mà node này là điều kiện trước. */
  unlocks: number;
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
