import prisma from './prisma';
import { getMonthExpenseByCategory } from './stats';

export const DEFAULT_BUDGET_MONTH = '*';

export interface BudgetLine {
  categoryId: number;
  name: string;
  icon: string;
  color: string;
  amount: number | null; // hạn mức hiệu lực của tháng (null = chưa đặt)
  source: 'MONTH' | 'DEFAULT' | null; // đặt riêng cho tháng / dùng mặc định
  defaultAmount: number | null;
  spent: number;
  percent: number | null;
}

// Trạng thái ngân sách mọi danh mục chi trong một tháng.
export async function getBudgetStatus(month: string): Promise<BudgetLine[]> {
  const [categories, budgets, spentMap] = await Promise.all([
    prisma.category.findMany({
      where: { kind: 'EXPENSE' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.budget.findMany({ where: { month: { in: [month, DEFAULT_BUDGET_MONTH] } } }),
    getMonthExpenseByCategory(month),
  ]);

  return categories.map((c) => {
    const own = budgets.find((b) => b.categoryId === c.id && b.month === month);
    const def = budgets.find((b) => b.categoryId === c.id && b.month === DEFAULT_BUDGET_MONTH);
    const eff = own ?? def;
    const amount = eff ? Number(eff.amount) : null;
    const spent = spentMap.get(c.id) ?? 0;
    return {
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      amount,
      source: own ? 'MONTH' : def ? 'DEFAULT' : null,
      defaultAmount: def ? Number(def.amount) : null,
      spent,
      percent: amount && amount > 0 ? spent / amount : null,
    };
  });
}
