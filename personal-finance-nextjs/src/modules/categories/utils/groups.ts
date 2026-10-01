import type { CategoryDTO, CategoryGroupDTO } from '../types';

// Danh mục "gợi ý" cho một tài khoản: danh mục cha thuộc các nhóm tài khoản đã gán, cùng mọi danh mục con của chúng
export function suggestedCategoryIds(groupIds: number[], categories: CategoryDTO[]): Set<number> {
  const out = new Set<number>();
  if (!groupIds.length) return out;
  const wanted = new Set(groupIds);
  const byId = new Map(categories.map((c) => [c.id, c]));
  for (const c of categories) {
    const top = c.parentId === null ? c : (byId.get(c.parentId) ?? c);
    if (top.groupId !== null && wanted.has(top.groupId)) out.add(c.id);
  }
  return out;
}

// Gợi ý cho ô chọn danh mục của một tài khoản (null khi tài khoản chưa gán nhóm nào)
export function suggestionFor(
  account: { name: string; groupIds: number[] } | undefined,
  categories: CategoryDTO[],
): { label: string; ids: Set<number> } | undefined {
  if (!account?.groupIds.length) return undefined;
  const ids = suggestedCategoryIds(account.groupIds, categories);
  return ids.size ? { label: `Gợi ý cho ${account.name}`, ids } : undefined;
}

// Nhóm của một tài khoản, theo thứ tự nhóm
export function groupsOfAccount(groupIds: number[], groups: CategoryGroupDTO[]): CategoryGroupDTO[] {
  const wanted = new Set(groupIds);
  return groups.filter((g) => wanted.has(g.id));
}

// Danh mục mặc định thực tế của nhóm: khai báo rõ, hoặc danh mục cha duy nhất trong nhóm (giống server)
export function effectiveDefaultCategoryId(g: CategoryGroupDTO): number | null {
  return g.defaultCategoryId ?? (g.categoryIds.length === 1 ? g.categoryIds[0] : null);
}
