import type { CategoryTotal } from '../types/stats.types';

export interface CategoryMeta {
  id: number;
  parentId: number | null;
  name: string;
  icon: string;
  color: string;
}

// Gộp tổng theo danh mục con vào danh mục cha (2 cấp).
// Trả về các dòng cấp cao nhất (và "Chưa phân loại"), mỗi dòng kèm `children` là chi tiết từng con, sắp xếp giảm dần.
export function foldCategoryTotals(rows: CategoryTotal[], cats: CategoryMeta[]): CategoryTotal[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const out = new Map<string, CategoryTotal>();
  const key = (id: number | null) => (id === null ? 'none' : String(id));

  for (const r of rows) {
    const meta = r.categoryId !== null ? byId.get(r.categoryId) : undefined;
    const parent = meta?.parentId != null ? byId.get(meta.parentId) : undefined;
    if (!parent) {
      // Cấp cao nhất hoặc chưa phân loại: cộng dồn nếu đã có (do con được xử lý trước)
      const cur = out.get(key(r.categoryId));
      if (cur) {
        cur.total += r.total;
        cur.count += r.count;
      } else {
        out.set(key(r.categoryId), { ...r, parentId: null, children: [] });
      }
      continue;
    }
    const k = key(parent.id);
    let p = out.get(k);
    if (!p) {
      p = { categoryId: parent.id, name: parent.name, icon: parent.icon, color: parent.color, total: 0, count: 0, parentId: null, children: [] };
      out.set(k, p);
    }
    p.total += r.total;
    p.count += r.count;
    p.children!.push({ ...r, parentId: parent.id });
  }

  return [...out.values()]
    .map((p) => ({ ...p, children: [...(p.children ?? [])].sort((a, b) => b.total - a.total) }))
    .sort((a, b) => b.total - a.total);
}
