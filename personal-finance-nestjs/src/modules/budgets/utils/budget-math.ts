// Phép tính thuần cho ngân sách (không đụng DB) để dùng chung và dễ kiểm thử.

export interface BudgetLineLike {
  categoryId: number;
  parentId: number | null;
  amount: number | null;
  spent: number;
}

export interface GroupBudgetLike {
  categoryIds: number[]; // danh mục cha trong nhóm
  amount: number | null; // hạn mức riêng của nhóm (null = chưa đặt)
  spent: number;
}

// Tổng hạn mức / đã chi của cả tháng, không cộng trùng:
// - nhóm có hạn mức riêng: tính một lần theo hạn mức và số đã chi của nhóm, bỏ qua các danh mục bên trong;
// - danh mục cha còn lại (không thuộc nhóm có hạn mức) và có hạn mức: tính theo danh mục.
export function budgetTotalsOf(lines: BudgetLineLike[], groups: GroupBudgetLike[]): { budget: number; spentBudgeted: number } {
  const budgetedGroups = groups.filter((g) => g.amount !== null);
  const covered = new Set(budgetedGroups.flatMap((g) => g.categoryIds));
  const cats = lines.filter((l) => l.parentId === null && l.amount !== null && !covered.has(l.categoryId));
  return {
    budget: budgetedGroups.reduce((s, g) => s + (g.amount ?? 0), 0) + cats.reduce((s, l) => s + (l.amount ?? 0), 0),
    spentBudgeted: budgetedGroups.reduce((s, g) => s + g.spent, 0) + cats.reduce((s, l) => s + l.spent, 0),
  };
}

// Phần hạn mức một danh mục cha "chiếm" trong nhóm: hạn mức riêng của cha, nếu cha chưa đặt thì tổng hạn mức các con
export function familyAmount(own: number | null, children: (number | null)[]): number | null {
  if (own !== null) return own;
  const set = children.filter((a): a is number => a !== null);
  return set.length ? set.reduce((s, a) => s + a, 0) : null;
}

// Tổng phần chiếm của các danh mục cha trong nhóm; null khi chưa danh mục nào có hạn mức
export function categoriesBudgetOf(families: { own: number | null; children: (number | null)[] }[]): number | null {
  const parts = families.map((f) => familyAmount(f.own, f.children)).filter((a): a is number => a !== null);
  return parts.length ? parts.reduce((s, a) => s + a, 0) : null;
}
