import prisma from './prisma';
import {
  addDaysStr,
  addMonths,
  daysBetween,
  endOfVNDayExclusive,
  isValidMonthStr,
  monthRange,
  monthsBetween,
  startOfVNDay,
  toVNMonthString,
} from './dates';
import { HttpError } from './api';
import {
  getByCategory,
  getCategoryMonthMatrix,
  getDaily,
  getMonthly,
  getSummary,
  getWeekday,
  getAccountBalances,
  type StatsScope,
} from './stats';
import { getBudgetStatus } from './budget';
import { previousPeriod } from './period';
import { txnSelect } from './txnQuery';

// ─── Tổng quan ───

export async function getDashboard(scope: StatsScope) {
  const prev = previousPeriod(scope);
  const prevScope = { ...prev, accountId: scope.accountId };
  const toMonth = scope.to.slice(0, 7);
  const monthlyFrom = `${addMonths(toMonth, -11)}-01`;
  const accountFilter = scope.accountId ? { accountId: scope.accountId } : {};

  // Ngân sách: theo tháng cuối của kỳ
  const budgetMonth = toMonth;
  const budgetMonthRange = monthRange(budgetMonth);

  const [
    summary,
    prevSummary,
    monthlyRaw,
    dailyRaw,
    prevDailyRaw,
    expenseByCategory,
    incomeByCategory,
    weekday,
    topExpenses,
    recent,
    balances,
    budgetLines,
    uncategorizedCount,
  ] = await Promise.all([
    getSummary(scope),
    getSummary(prevScope),
    getMonthly({ from: monthlyFrom, to: monthRange(toMonth).to, accountId: scope.accountId }),
    getDaily(scope),
    getDaily(prevScope),
    getByCategory(scope, 'OUT'),
    getByCategory(scope, 'IN'),
    getWeekday(scope),
    prisma.transaction.findMany({
      where: {
        ...accountFilter,
        direction: 'OUT',
        excludeFromStats: false,
        transactionDate: {
          gte: startOfVNDay(scope.from),
          lt: endOfVNDayExclusive(scope.to),
        },
      },
      select: txnSelect,
      orderBy: [{ amount: 'desc' }, { id: 'desc' }],
      take: 10,
    }),
    prisma.transaction.findMany({
      where: accountFilter,
      select: txnSelect,
      orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
      take: 8,
    }),
    getAccountBalances(),
    getBudgetStatus(budgetMonth),
    prisma.transaction.count({ where: { ...accountFilter, categoryId: null, excludeFromStats: false } }),
  ]);

  // 12 tháng, điền 0 cho tháng trống
  const monthly = monthsBetween(addMonths(toMonth, -11), toMonth).map((m) => {
    const p = monthlyRaw.find((r) => r.month === m);
    return { month: m, income: p?.income ?? 0, expense: p?.expense ?? 0 };
  });

  // Theo ngày trong kỳ + lũy kế chi, so với cùng thứ tự ngày của kỳ trước
  const days = Math.min(daysBetween(scope.from, scope.to), 400);
  const prevDays = daysBetween(prev.from, prev.to);
  let cum = 0;
  let prevCum = 0;
  const daily = Array.from({ length: days }, (_, i) => {
    const date = addDaysStr(scope.from, i);
    const d = dailyRaw.find((r) => r.date === date);
    cum += d?.expense ?? 0;
    let prevCumulative: number | null = null;
    if (i < prevDays) {
      const pd = prevDailyRaw.find((r) => r.date === addDaysStr(prev.from, i));
      prevCum += pd?.expense ?? 0;
      prevCumulative = prevCum;
    }
    return {
      date,
      income: d?.income ?? 0,
      expense: d?.expense ?? 0,
      cumulativeExpense: cum,
      prevCumulativeExpense: prevCumulative,
    };
  });

  const budgeted = budgetLines.filter((l) => l.amount !== null);
  const totalBudget = budgeted.reduce((s, l) => s + (l.amount ?? 0), 0);
  const totalBudgetSpent = budgeted.reduce((s, l) => s + l.spent, 0);
  const periodIsBudgetMonth = scope.from === budgetMonthRange.from && scope.to <= budgetMonthRange.to;

  const visibleBalances = balances.filter((b) => b.isActive);

  return {
    period: { from: scope.from, to: scope.to },
    prevPeriod: prev,
    summary,
    prevSummary,
    monthly,
    daily,
    expenseByCategory,
    incomeByCategory,
    weekday,
    topExpenses,
    recent,
    balances: visibleBalances,
    totalBalance: visibleBalances.reduce((s, b) => s + b.balance, 0),
    budget: {
      month: budgetMonth,
      totalBudget,
      totalSpent: totalBudgetSpent,
      showOnDailyChart: periodIsBudgetMonth && totalBudget > 0,
      alerts: budgeted
        .filter((l) => (l.percent ?? 0) >= 0.8)
        .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0)),
    },
    uncategorizedCount,
  };
}

// ─── Thống kê theo tháng / danh mục ───

export interface ReportScope {
  fromMonth: string;
  toMonth: string;
  accountId?: number | null;
}

export async function getReport(r: ReportScope) {
  const months = monthsBetween(r.fromMonth, r.toMonth);
  const scope: StatsScope = {
    from: monthRange(r.fromMonth).from,
    to: monthRange(r.toMonth).to,
    accountId: r.accountId,
  };
  const prevYearScope: StatsScope = {
    from: monthRange(addMonths(r.fromMonth, -12)).from,
    to: monthRange(addMonths(r.toMonth, -12)).to,
    accountId: r.accountId,
  };

  const [monthlyRaw, prevYearRaw, expenseCells, incomeCells, categories, summary] = await Promise.all([
    getMonthly(scope),
    getMonthly(prevYearScope),
    getCategoryMonthMatrix(scope, 'OUT'),
    getCategoryMonthMatrix(scope, 'IN'),
    prisma.category.findMany({ orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] }),
    getSummary(scope),
  ]);

  const monthly = months.map((m) => {
    const p = monthlyRaw.find((x) => x.month === m);
    const py = prevYearRaw.find((x) => x.month === addMonths(m, -12));
    const income = p?.income ?? 0;
    const expense = p?.expense ?? 0;
    return {
      month: m,
      income,
      expense,
      net: income - expense,
      savingsRate: income > 0 ? (income - expense) / income : null,
      prevYearIncome: py?.income ?? 0,
      prevYearExpense: py?.expense ?? 0,
    };
  });

  const buildRows = (cells: typeof expenseCells, kind: 'EXPENSE' | 'INCOME') => {
    const cats = categories.filter((c) => c.kind === kind);
    const rows = [
      ...cats.map((c) => ({ categoryId: c.id as number | null, name: c.name, icon: c.icon, color: c.color })),
      { categoryId: null, name: 'Chưa phân loại', icon: 'CircleHelp', color: '#94A3B8' },
    ].map((c) => {
      const values = months.map(
        (m) => cells.find((x) => x.categoryId === c.categoryId && x.month === m)?.total ?? 0
      );
      const total = values.reduce((s, v) => s + v, 0);
      return { ...c, values, total, average: months.length ? total / months.length : 0 };
    });
    return rows.filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
  };

  return {
    months,
    monthly,
    summary,
    monthCount: months.length,
    expenseRows: buildRows(expenseCells, 'EXPENSE'),
    incomeRows: buildRows(incomeCells, 'INCOME'),
  };
}

export function defaultReportRange(): { fromMonth: string; toMonth: string } {
  const toMonth = toVNMonthString(new Date());
  return { fromMonth: addMonths(toMonth, -5), toMonth };
}

export function parseReportScope(sp: URLSearchParams): ReportScope {
  const def = defaultReportRange();
  const fromMonth = sp.get('fromMonth') ?? def.fromMonth;
  const toMonth = sp.get('toMonth') ?? def.toMonth;
  if (!isValidMonthStr(fromMonth) || !isValidMonthStr(toMonth) || fromMonth > toMonth) {
    throw new HttpError(400, 'Khoảng tháng không hợp lệ');
  }
  if (monthsBetween(fromMonth, toMonth).length > 36) throw new HttpError(400, 'Tối đa 36 tháng');
  return { fromMonth, toMonth, accountId: Number(sp.get('accountId')) || null };
}
