import prisma from './prisma';
import { getByCategory, getSummary } from './stats';
import { addMonths, monthRange } from './dates';

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
  count: number; // số giao dịch chi trong tháng
  prevSpent: number; // đã chi tháng trước (để so sánh)
  percent: number | null;
}

async function expenseByCategory(month: string) {
  const { from, to } = monthRange(month);
  const rows = await getByCategory({ from, to }, 'OUT');
  return new Map(rows.map((r) => [r.categoryId, r]));
}

// Trạng thái ngân sách mọi danh mục chi trong một tháng.
export async function getBudgetStatus(month: string): Promise<BudgetLine[]> {
  const [categories, budgets, spent, prev] = await Promise.all([
    prisma.category.findMany({
      where: { kind: 'EXPENSE' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.budget.findMany({ where: { month: { in: [month, DEFAULT_BUDGET_MONTH] } } }),
    expenseByCategory(month),
    expenseByCategory(addMonths(month, -1)),
  ]);

  return categories.map((c) => {
    const own = budgets.find((b) => b.categoryId === c.id && b.month === month);
    const def = budgets.find((b) => b.categoryId === c.id && b.month === DEFAULT_BUDGET_MONTH);
    const eff = own ?? def;
    const amount = eff ? Number(eff.amount) : null;
    const s = spent.get(c.id);
    return {
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      amount,
      source: own ? 'MONTH' : def ? 'DEFAULT' : null,
      defaultAmount: def ? Number(def.amount) : null,
      spent: s?.total ?? 0,
      count: s?.count ?? 0,
      prevSpent: prev.get(c.id)?.total ?? 0,
      percent: amount && amount > 0 ? (s?.total ?? 0) / amount : null,
    };
  });
}

export interface BudgetMonthTotals {
  month: string;
  budget: number; // tổng hạn mức hiệu lực
  spentBudgeted: number; // đã chi ở các danh mục có hạn mức
  expense: number; // tổng chi cả tháng (mọi danh mục, kể cả chưa phân loại)
}

async function monthTotals(month: string): Promise<BudgetMonthTotals> {
  const { from, to } = monthRange(month);
  const [lines, summary] = await Promise.all([getBudgetStatus(month), getSummary({ from, to })]);
  const budgeted = lines.filter((l) => l.amount !== null);
  return {
    month,
    budget: budgeted.reduce((s, l) => s + (l.amount ?? 0), 0),
    spentBudgeted: budgeted.reduce((s, l) => s + l.spent, 0),
    expense: summary.expense,
  };
}

// Dữ liệu cho trang Ngân sách: từng danh mục + thu nhập tháng + lịch sử 3 tháng gần nhất.
export async function getBudgetPage(month: string) {
  const { from, to } = monthRange(month);
  const [lines, summary, history] = await Promise.all([
    getBudgetStatus(month),
    getSummary({ from, to }),
    Promise.all([addMonths(month, -2), addMonths(month, -1)].map(monthTotals)),
  ]);
  const budgeted = lines.filter((l) => l.amount !== null);
  const current: BudgetMonthTotals = {
    month,
    budget: budgeted.reduce((s, l) => s + (l.amount ?? 0), 0),
    spentBudgeted: budgeted.reduce((s, l) => s + l.spent, 0),
    expense: summary.expense,
  };
  return { month, lines, income: summary.income, expense: summary.expense, history: [...history, current] };
}
