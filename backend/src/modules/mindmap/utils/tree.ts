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
