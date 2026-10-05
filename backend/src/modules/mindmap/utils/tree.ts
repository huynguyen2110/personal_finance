// Thao tác thuần trên cây node của một mindmap (danh sách phẳng id + parentId) — có test riêng.

export interface TreeLink {
  id: number;
  parentId: number | null;
}

// Đặt `newParentId` làm cha của `nodeId` có tạo vòng lặp không (cha mới nằm trong cây con của chính nó)
export function createsCycle(nodes: TreeLink[], nodeId: number, newParentId: number): boolean {
  if (newParentId === nodeId) return true;
  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
  const seen = new Set<number>();
  let cursor: number | null | undefined = newParentId;
  while (cursor != null && !seen.has(cursor)) {
    if (cursor === nodeId) return true;
    seen.add(cursor);
    cursor = parentOf.get(cursor);
  }
  return false;
}

// Id của node và toàn bộ cây con bên dưới (để biết sẽ xóa bao nhiêu node)
export function subtreeIds(nodes: TreeLink[], rootId: number): number[] {
  const children = new Map<number, number[]>();
  for (const n of nodes) {
    if (n.parentId === null) continue;
    const list = children.get(n.parentId) ?? [];
    list.push(n.id);
    children.set(n.parentId, list);
  }
  const out: number[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

export interface LinkEdge {
  sourceNodeId: number;
  targetNodeId: number;
}

// Thêm cạnh điều kiện trước source → target có tạo vòng không (target đã dẫn tới source qua các cạnh hiện có)
export function createsLinkCycle(edges: LinkEdge[], sourceId: number, targetId: number): boolean {
  if (sourceId === targetId) return true;
  const next = new Map<number, number[]>();
  for (const e of edges) {
    const list = next.get(e.sourceNodeId) ?? [];
    list.push(e.targetNodeId);
    next.set(e.sourceNodeId, list);
  }
  const seen = new Set<number>();
  const stack = [targetId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === sourceId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  return false;
}

// Độ sâu (gốc = 0) và lĩnh vực (tổ tiên cấp 1; null với nút gốc) của từng node
export function depthAndArea(nodes: TreeLink[]): Map<number, { depth: number; areaId: number | null }> {
  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
  const out = new Map<number, { depth: number; areaId: number | null }>();
  const resolve = (id: number): { depth: number; areaId: number | null } => {
    const cached = out.get(id);
    if (cached) return cached;
    const parentId = parentOf.get(id);
    let result: { depth: number; areaId: number | null };
    if (parentId == null || !parentOf.has(parentId)) {
      result = { depth: 0, areaId: null };
    } else {
      const parent = resolve(parentId);
      result = { depth: parent.depth + 1, areaId: parent.depth === 0 ? id : parent.areaId };
    }
    out.set(id, result);
    return result;
  };
  for (const n of nodes) resolve(n.id);
  return out;
}
