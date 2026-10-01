import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { addMonths, monthRange } from '../../../common/utils/dates.util';
import { StatsService } from '../../stats/services/stats.service';
import type { BudgetItemDto } from '../dto/budget.dto';

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

export interface BudgetMonthTotals {
  month: string;
  budget: number; // tổng hạn mức hiệu lực
  spentBudgeted: number; // đã chi ở các danh mục có hạn mức
  expense: number; // tổng chi cả tháng (mọi danh mục, kể cả chưa phân loại)
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  private async expenseByCategory(month: string) {
    const { from, to } = monthRange(month);
    const rows = await this.stats.getByCategory({ from, to }, 'OUT');
    return new Map(rows.map((r) => [r.categoryId, r]));
  }

  // Trạng thái ngân sách mọi danh mục chi trong một tháng.
  async getBudgetStatus(month: string): Promise<BudgetLine[]> {
    const [categories, budgets, spent, prev] = await Promise.all([
      this.prisma.category.findMany({ where: { kind: 'EXPENSE' }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.budget.findMany({ where: { month: { in: [month, DEFAULT_BUDGET_MONTH] } } }),
      this.expenseByCategory(month),
      this.expenseByCategory(addMonths(month, -1)),
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

  private totals(month: string, lines: BudgetLine[], expense: number): BudgetMonthTotals {
    const budgeted = lines.filter((l) => l.amount !== null);
    return {
      month,
      budget: budgeted.reduce((s, l) => s + (l.amount ?? 0), 0),
      spentBudgeted: budgeted.reduce((s, l) => s + l.spent, 0),
      expense,
    };
  }

  private async monthTotals(month: string): Promise<BudgetMonthTotals> {
    const { from, to } = monthRange(month);
    const [lines, summary] = await Promise.all([this.getBudgetStatus(month), this.stats.getSummary({ from, to })]);
    return this.totals(month, lines, summary.expense);
  }

  // Dữ liệu cho trang Ngân sách: từng danh mục + thu nhập tháng + lịch sử 3 tháng gần nhất.
  async getBudgetPage(month: string) {
    const { from, to } = monthRange(month);
    const [lines, summary, history] = await Promise.all([
      this.getBudgetStatus(month),
      this.stats.getSummary({ from, to }),
      Promise.all([addMonths(month, -2), addMonths(month, -1)].map((m) => this.monthTotals(m))),
    ]);
    return {
      month,
      lines,
      income: summary.income,
      expense: summary.expense,
      history: [...history, this.totals(month, lines, summary.expense)],
    };
  }

  // Lưu nhiều hạn mức trong một transaction; amount = null là xóa
  async save(items: BudgetItemDto[]) {
    const ids = [...new Set(items.map((i) => i.categoryId))];
    const cats = await this.prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true } });
    if (cats.length !== ids.length) throw new BadRequestException('Danh mục không tồn tại');
    if (cats.some((c) => c.kind !== 'EXPENSE')) throw new BadRequestException('Chỉ đặt ngân sách cho danh mục chi');

    await this.prisma.$transaction(
      items.map(({ categoryId, month, amount }) =>
        amount === null
          ? this.prisma.budget.deleteMany({ where: { categoryId, month } })
          : this.prisma.budget.upsert({
              where: { categoryId_month: { categoryId, month } },
              update: { amount: BigInt(amount) },
              create: { categoryId, month, amount: BigInt(amount) },
            }),
      ),
    );
    return { ok: true, saved: items.length };
  }

  // Sao chép hạn mức đặt riêng của tháng trước sang tháng này (ghi đè nếu đã có)
  async copyFromPreviousMonth(month: string) {
    const prev = await this.prisma.budget.findMany({ where: { month: addMonths(month, -1) } });
    for (const b of prev) {
      await this.prisma.budget.upsert({
        where: { categoryId_month: { categoryId: b.categoryId, month } },
        update: { amount: b.amount },
        create: { categoryId: b.categoryId, month, amount: b.amount },
      });
    }
    return { copied: prev.length };
  }
}
