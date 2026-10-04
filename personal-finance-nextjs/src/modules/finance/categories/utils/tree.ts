import type { CategoryKind } from '@/types/common';
import type { CategoryDTO } from '../types';

export interface CategoryNode {
  cat: CategoryDTO;
  children: CategoryDTO[];
}

const byOrder = (a: CategoryDTO, b: CategoryDTO) => a.sortOrder - b.sortOrder || a.id - b.id;

// Dựng cây 2 cấp: danh mục cấp cao nhất kèm danh sách con. Con mồ côi (cha đã mất) được coi là cấp cao nhất.
export function buildCategoryTree(categories: CategoryDTO[], kind?: CategoryKind): CategoryNode[] {
  const list = kind ? categories.filter((c) => c.kind === kind) : categories;
  const ids = new Set(list.map((c) => c.id));
  const roots = list.filter((c) => c.parentId === null || !ids.has(c.parentId)).sort(byOrder);
  const childrenOf = new Map<number, CategoryDTO[]>();
  for (const c of list) {
    if (c.parentId !== null && ids.has(c.parentId)) {
      if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, []);
      childrenOf.get(c.parentId)!.push(c);
    }
  }
  return roots.map((cat) => ({ cat, children: (childrenOf.get(cat.id) ?? []).sort(byOrder) }));
}

// Các danh mục có thể làm cha cho một danh mục thuộc `kind` (cấp cao nhất, cùng loại, không phải chính nó)
export function parentOptions(categories: CategoryDTO[], kind: CategoryKind, excludeId?: number | null): CategoryDTO[] {
  return categories.filter((c) => c.kind === kind && c.parentId === null && c.id !== excludeId).sort(byOrder);
}

// Tên hiển thị kèm cha: "Ăn uống › Cà phê"
export function categoryPath(c: CategoryDTO, categories: CategoryDTO[]): string {
  const parent = c.parentId !== null ? categories.find((p) => p.id === c.parentId) : undefined;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}
