import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  addDaysStr,
  addMonths,
  daysBetween,
  endOfVNDayExclusive,
  isValidDateStr,
  isValidMonthStr,
  currentMonthVN,
  monthOfDate,
  monthRange,
  monthsBetween,
  startOfVNDay,
} from '../../../common/utils/dates.util';
import { previousPeriod } from '../../../common/utils/period.util';
import { SettingsService } from '../../../services/settings.service';
import { StatsService } from '../../stats/services/stats.service';
import type { CategoryMonthCell, StatsScope } from '../../stats/types/stats.types';
import { foldCategoryTotals } from '../../stats/utils/category-rollup';
import { BudgetsService, budgetUnits } from '../../budgets/services/budgets.service';
import { AccountsService } from '../../accounts/services/accounts.service';
import { txnSelect } from '../../transactions/utils/txn-query';
import type { DashboardQueryDto, ReportQueryDto } from '../dto/report.dto';

export interface ReportScope {
  fromMonth: string;
  toMonth: string;
  accountId?: number | null;
}

// Một dòng ma trận danh mục × tháng. Dòng cha gộp cả con; dòng con có parentId.
export interface ReportRow {
  categoryId: number | null;
  parentId: number | null;
  name: string;
  icon: string;
  color: string;
  values: number[];
  total: number;
  average: number;
}

const CATEGORY_META_SELECT = { id: true, parentId: true, name: true, icon: true, color: true, kind: true, sortOrder: true } as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly budgets: BudgetsService,
    private readonly accounts: AccountsService,
    private readonly settings: SettingsService,
  ) {}

  parseDashboardScope(q: DashboardQueryDto): StatsScope {
    const { from, to } = q;
    if (!isValidDateStr(from) || !isValidDateStr(to) || from > to) throw new BadRequestException('Khoảng ngày không hợp lệ');
    if (daysBetween(from, to) > 800) throw new BadRequestException('Khoảng ngày tối đa ~2 năm');
    return { from, to, accountId: Number(q.accountId) || null };
  }

  // Mặc định: 6 tháng tài chính gần nhất (theo ngày bắt đầu tháng trong cài đặt)
  async parseReportScope(q: ReportQueryDto): Promise<ReportScope> {
    const toDefault = currentMonthVN(await this.settings.monthStartDay());
    const fromMonth = q.fromMonth ?? addMonths(toDefault, -5);
    const toMonth = q.toMonth ?? toDefault;
    if (!isValidMonthStr(fromMonth) || !isValidMonthStr(toMonth) || fromMonth > toMonth) {
      throw new BadRequestException('Khoảng tháng không hợp lệ');
    }
    if (monthsBetween(fromMonth, toMonth).length > 36) throw new BadRequestException('Tối đa 36 tháng');
    return { fromMonth, toMonth, accountId: Number(q.accountId) || null };
  }

  // ─── Tổng quan ───

  async getDashboard(scope: StatsScope) {
    // Mọi mốc "tháng" theo tháng tài chính (ngày bắt đầu tháng trong cài đặt)
    const sd = await this.settings.monthStartDay();
    const prev = previousPeriod(scope, sd);
    const prevScope = { ...prev, accountId: scope.accountId };
    const toMonth = monthOfDate(scope.to, sd);
    const monthlyFrom = monthRange(addMonths(toMonth, -11), sd).from;
    const accountFilter = scope.accountId ? { accountId: scope.accountId } : {};

    // Ngân sách: theo tháng (tài chính) chứa ngày cuối của kỳ
    const budgetMonth = toMonth;
    const budgetMonthRange = monthRange(budgetMonth, sd);

    const [
      summary,
      prevSummary,
      monthlyRaw,
      dailyRaw,
      prevDailyRaw,
      expenseRaw,
      incomeRaw,
      categories,
      weekday,
      topExpenses,
      recent,
      balances,
      budgetLines,
      uncategorizedCount,
    ] = await Promise.all([
      this.stats.getSummary(scope),
      this.stats.getSummary(prevScope),
      this.stats.getMonthly({ from: monthlyFrom, to: budgetMonthRange.to, accountId: scope.accountId, monthStartDay: sd }),
      this.stats.getDaily(scope),
      this.stats.getDaily(prevScope),
      this.stats.getByCategory(scope, 'OUT'),
      this.stats.getByCategory(scope, 'IN'),
      this.prisma.category.findMany({ select: CATEGORY_META_SELECT }),
      this.stats.getWeekday(scope),
      this.prisma.transaction.findMany({
        where: {
          ...accountFilter,
          direction: 'OUT',
          excludeFromStats: false,
          transactionDate: { gte: startOfVNDay(scope.from), lt: endOfVNDayExclusive(scope.to) },
        },
        select: txnSelect,
        orderBy: [{ amount: 'desc' }, { id: 'desc' }],
        take: 10,
      }),
      this.prisma.transaction.findMany({
        where: accountFilter,
        select: txnSelect,
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        take: 8,
      }),
      this.accounts.listWithBalances(),
      this.budgets.getBudgetStatus(budgetMonth),
      this.prisma.transaction.count({ where: { ...accountFilter, categoryId: null, excludeFromStats: false } }),
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
      return { date, income: d?.income ?? 0, expense: d?.expense ?? 0, cumulativeExpense: cum, prevCumulativeExpense: prevCumulative };
    });

    // Ngân sách: tổng theo dòng cấp cao nhất (đã gộp con); cảnh báo theo từng đơn vị hạn mức
    const { budget: totalBudget, spentBudgeted: totalBudgetSpent } = this.budgets.totals(budgetMonth, budgetLines, summary.expense);
    const periodIsBudgetMonth = scope.from === budgetMonthRange.from && scope.to <= budgetMonthRange.to;
    const visibleBalances = balances.filter((b) => b.isActive);

    return {
      period: { from: scope.from, to: scope.to },
      prevPeriod: prev,
      monthStartDay: sd,
      summary,
      prevSummary,
      monthly,
      daily,
      // Cơ cấu theo danh mục cha (con gộp vào cha, chi tiết nằm trong `children`)
      expenseByCategory: foldCategoryTotals(expenseRaw, categories),
      incomeByCategory: foldCategoryTotals(incomeRaw, categories),
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
        alerts: budgetUnits(budgetLines)
          .filter((l) => (l.percent ?? 0) >= 0.8)
          .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0)),
      },
      uncategorizedCount,
    };
  }

  // ─── Thống kê theo tháng / danh mục ───

  async getReport(r: ReportScope) {
    const sd = await this.settings.monthStartDay();
    const months = monthsBetween(r.fromMonth, r.toMonth);
    const scope: StatsScope = { from: monthRange(r.fromMonth, sd).from, to: monthRange(r.toMonth, sd).to, accountId: r.accountId, monthStartDay: sd };
    const prevYearScope: StatsScope = {
      from: monthRange(addMonths(r.fromMonth, -12), sd).from,
      to: monthRange(addMonths(r.toMonth, -12), sd).to,
      accountId: r.accountId,
      monthStartDay: sd,
    };

    const [monthlyRaw, prevYearRaw, expenseCells, incomeCells, categories, summary] = await Promise.all([
      this.stats.getMonthly(scope),
      this.stats.getMonthly(prevYearScope),
      this.stats.getCategoryMonthMatrix(scope, 'OUT'),
      this.stats.getCategoryMonthMatrix(scope, 'IN'),
      this.prisma.category.findMany({ select: CATEGORY_META_SELECT, orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] }),
      this.stats.getSummary(scope),
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

    // Ma trận 2 cấp: dòng cha (gộp cả con) rồi đến các dòng con; chỉ giữ dòng có phát sinh
    const buildRows = (cells: CategoryMonthCell[], kind: 'EXPENSE' | 'INCOME'): ReportRow[] => {
      const cats = categories.filter((c) => c.kind === kind);
      const valuesFor = (ids: (number | null)[]): number[] =>
        months.map((m) => ids.reduce<number>((s, id) => s + (cells.find((x) => x.categoryId === id && x.month === m)?.total ?? 0), 0));
      const row = (meta: { categoryId: number | null; parentId: number | null; name: string; icon: string; color: string }, values: number[]): ReportRow => {
        const total = values.reduce((s, v) => s + v, 0);
        return { ...meta, values, total, average: months.length ? total / months.length : 0 };
      };

      const groups = cats
        .filter((c) => c.parentId === null)
        .map((parent) => {
          const children = cats.filter((c) => c.parentId === parent.id);
          const head = row({ categoryId: parent.id, parentId: null, name: parent.name, icon: parent.icon, color: parent.color }, valuesFor([parent.id, ...children.map((c) => c.id)]));
          const subs = children
            .map((c) => row({ categoryId: c.id, parentId: parent.id, name: c.name, icon: c.icon, color: c.color }, valuesFor([c.id])))
            .filter((x) => x.total > 0)
            .sort((a, b) => b.total - a.total);
          return { head, subs };
        })
        .filter((g) => g.head.total > 0)
        .sort((a, b) => b.head.total - a.head.total);

      const rows = groups.flatMap((g) => [g.head, ...g.subs]);
      const none = row({ categoryId: null, parentId: null, name: 'Chưa phân loại', icon: 'CircleHelp', color: '#94A3B8' }, valuesFor([null]));
      if (none.total > 0) rows.push(none);
      return rows;
    };

    return {
      months,
      monthStartDay: sd,
      monthly,
      summary,
      monthCount: months.length,
      expenseRows: buildRows(expenseCells, 'EXPENSE'),
      incomeRows: buildRows(incomeCells, 'INCOME'),
    };
  }
}
