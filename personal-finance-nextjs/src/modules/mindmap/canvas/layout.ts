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

export type NodeSide = 'root' | 'left' | 'right';

export interface TreeLayout {
  rects: Map<number, NodeRect>;
  /** Phía của mỗi node so với nút gốc (nhánh con theo phía của lĩnh vực). */
  side: Map<number, NodeSide>;
}

/**
 * Bố cục 2 bên kiểu XMind: các nhánh cấp 1 chia sang phải / trái nút gốc sao cho số node
 * hai bên gần bằng nhau (giữ thứ tự: nửa đầu bên phải, nửa sau bên trái). Mỗi bên xếp bằng dagre
 * (phải: LR, trái: RL) rồi ghép lại theo tâm nút gốc. Cây chỉ còn cao khoảng một nửa so với xếp một bên.
 */
export function layoutTree(
  visible: TreeNode[],
  rootId: number | null,
  chipsOf?: Map<number, NodeChip[]>,
): TreeLayout {
  const rects = new Map<number, NodeRect>();
  const side = new Map<number, NodeSide>();
  const root = visible.find((n) => n.id === rootId);
  if (!root) return { rects, side };

  const visibleIds = new Set(visible.map((n) => n.id));
  const childrenOf = new Map<number, TreeNode[]>();
  for (const n of visible) {
    if (n.parentId === null || !visibleIds.has(n.parentId)) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n);
    childrenOf.set(n.parentId, list);
  }
  const subtree = (n: TreeNode): TreeNode[] => [n, ...(childrenOf.get(n.id) ?? []).flatMap(subtree)];

  // Chia nhánh cấp 1: nửa đầu (theo số node) sang phải, phần còn lại sang trái
  const areas = childrenOf.get(root.id) ?? [];
  const sizes = areas.map((a) => subtree(a).length);
  const total = sizes.reduce((a, b) => a + b, 0);
  const right: TreeNode[][] = [];
  const left: TreeNode[][] = [];
  let acc = 0;
  areas.forEach((a, i) => {
    // Nhánh đầu luôn bên phải; nhánh tiếp theo sang phải nếu đặt vào vẫn gần nửa hơn
    const toRight = i === 0 || Math.abs(total / 2 - (acc + sizes[i])) <= Math.abs(total / 2 - acc);
    if (toRight && left.length === 0) {
      right.push(subtree(a));
      acc += sizes[i];
    } else {
      left.push(subtree(a));
    }
  });

  const sizeOf = (n: TreeNode) =>
    estimateNodeSize(n, n.id === rootId, chipsOf?.get(n.id) ?? EMPTY_CHIPS);

  // Xếp một bên (gồm cả nút gốc) bằng dagre; trả về rect của các node, lệch sao cho tâm gốc ở (0, 0)
  const layoutSide = (groups: TreeNode[][], rankdir: 'LR' | 'RL') => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir, nodesep: 16, ranksep: 60 });
    g.setDefaultEdgeLabel(() => ({}));
    const nodes = [root, ...groups.flat()];
    for (const n of nodes) g.setNode(String(n.id), sizeOf(n));
    for (const n of nodes) {
      if (n.id !== root.id && n.parentId !== null) g.setEdge(String(n.parentId), String(n.id));
    }
    dagre.layout(g);
    const r = g.node(String(root.id));
    const out = new Map<number, NodeRect>();
    for (const n of nodes) {
      const pos = g.node(String(n.id));
      out.set(n.id, {
        x: pos.x - r.x - pos.width / 2,
        y: pos.y - r.y - pos.height / 2,
        width: pos.width,
        height: pos.height,
      });
    }
    return out;
  };

  const rightRects = layoutSide(right, 'LR');
  for (const [id, rect] of rightRects) {
    rects.set(id, rect);
    side.set(id, id === root.id ? 'root' : 'right');
  }
  if (left.length) {
    for (const [id, rect] of layoutSide(left, 'RL')) {
      if (id === root.id) continue;
      rects.set(id, rect);
      side.set(id, 'left');
    }
  }
  return { rects, side };
}
