import dagre from '@dagrejs/dagre';
import { TreeNode } from '@/modules/mindmap/mindmaps/types';
import { chipWidth, NodeChip } from './chips';

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EMPTY_CHIPS: NodeChip[] = [];

export function estimateNodeSize(
  node: TreeNode,
  isRoot: boolean,
  chips: NodeChip[],
) {
  // Same numbers feed dagre and the CSS pill so layout matches rendering.
  const badges = (node.todoTotal > 0 ? 52 : 0) + (node.status ? 18 : 0);
  // 56 = padding + icon trang; +18 cho nút nối liên kết
  const titleWidth = 74 + node.title.length * 7.5 + badges;
  const chipsRow =
    chips.length > 0
      ? 24 + chips.reduce((sum, c) => sum + chipWidth(c) + 4, 0)
      : 0;
  const width = Math.round(
    Math.min(340, Math.max(isRoot ? 150 : 120, titleWidth, chipsRow)),
  );
  const height = (isRoot ? 52 : 40) + (chips.length > 0 ? 22 : 0);
  return { width, height };
}

/** dagre LR layout over the visible tree; returns center-corrected rects. */
export function layoutTree(
  visible: TreeNode[],
  rootId: number | null,
  chipsOf?: Map<number, NodeChip[]>,
): Map<number, NodeRect> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 18, ranksep: 90, marginx: 60, marginy: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  const visibleIds = new Set(visible.map((n) => n.id));
  for (const node of visible) {
    g.setNode(
      String(node.id),
      estimateNodeSize(
        node,
        node.id === rootId,
        chipsOf?.get(node.id) ?? EMPTY_CHIPS,
      ),
    );
  }
  for (const node of visible) {
    if (node.parentId !== null && visibleIds.has(node.parentId)) {
      g.setEdge(String(node.parentId), String(node.id));
    }
  }

  dagre.layout(g);

  const rects = new Map<number, NodeRect>();
  for (const node of visible) {
    const pos = g.node(String(node.id));
    rects.set(node.id, {
      x: pos.x - pos.width / 2,
      y: pos.y - pos.height / 2,
      width: pos.width,
      height: pos.height,
    });
  }
  return rects;
}
