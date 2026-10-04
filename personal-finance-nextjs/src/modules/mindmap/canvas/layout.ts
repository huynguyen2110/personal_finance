import dagre from '@dagrejs/dagre';
import { TreeNode } from '@/modules/mindmap/mindmaps/types';
import type { NodeKind } from './types';

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

/** Vừa màn hình nhưng không thu nhỏ dưới 60% (chữ vẫn đọc được); phần tràn thì kéo / cuộn để xem. */
export const FIT_VIEW = { padding: 0.15, minZoom: 0.6, maxZoom: 1 };

/** Kích thước thẻ node — các con số khớp với CSS trong MindNode để bố cục khớp hiển thị. */
export const ACTION_WIDTH = 256;
export const ROOT_WIDTH = 224;

export function estimateNodeSize(
  kind: NodeKind,
  title: string,
  opts: { hasBadge?: boolean; hasChips?: boolean; hasProgress?: boolean } = {},
): NodeSize {
  if (kind === 'root') return { width: ROOT_WIDTH, height: 132 };
  if (kind === 'area') {
    // padding 24 + chấm màu 18 + chữ 15px semibold (~8.6px/ký tự) + huy hiệu ưu tiên
    const width = 42 + title.length * 8.6 + (opts.hasBadge ? 54 : 0);
    return { width: Math.round(Math.min(300, Math.max(130, width))), height: 42 };
  }
  // Thẻ hành động: 2 dòng cố định (+ chip thuộc tính khác, + thanh tiến độ)
  return {
    width: ACTION_WIDTH,
    height: 66 + (opts.hasChips ? 22 : 0) + (opts.hasProgress ? 10 : 0),
  };
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
  sizeOf: (node: TreeNode) => NodeSize,
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

  // Xếp một bên (gồm cả nút gốc) bằng dagre; trả về rect của các node, lệch sao cho tâm gốc ở (0, 0)
  const layoutSide = (groups: TreeNode[][], rankdir: 'LR' | 'RL') => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir, nodesep: 14, ranksep: 64 });
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
