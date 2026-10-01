import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { addMonths, monthRange } from '../../../common/utils/dates.util';
import { StatsService } from '../../stats/services/stats.service';
import type { BudgetItemDto } from '../dto/budget.dto';

export const DEFAULT_BUDGET_MONTH = '*';

export interface BudgetLine {
  categoryId: number;
  parentId: number | null; // danh mục 2 cấp: con trỏ về cha
  name: string;
  icon: string;
  color: string;
  // Hạn mức hiệu lực của tháng (null = chưa đặt). Với danh mục cha chưa đặt riêng: tổng hạn mức các con.
  amount: number | null;
  // MONTH: đặt riêng cho tháng; DEFAULT: dùng mặc định; CHILDREN: gộp từ hạn mức các con
  source: 'MONTH' | 'DEFAULT' | 'CHILDREN' | null;
  defaultAmount: number | null;
  spent: number; // danh mục cha: cộng cả các con
  count: number; // số giao dịch chi trong tháng (cha: cộng cả con)
  prevSpent: number; // đã chi tháng trước (để so sánh)
  percent: number | null;
}

// Một nhóm chi tiêu trong khung của một tài khoản
export interface GroupBudgetLine {
  groupId: number;
  name: string;
  icon: string;
  color: string;
  categoryIds: number[]; // danh mục cha trong nhóm
  budget: number | null; // tổng hạn mức hiệu lực của các danh mục cha (null = chưa đặt)
  spent: number; // đã chi từ tài khoản này vào các danh mục của nhóm (kể cả con)
  count: number;
  sharedAccounts: number; // số tài khoản khác cũng gán nhóm này (hạn mức nhóm bị tính ở nhiều tài khoản)
}

// Ngân sách theo tài khoản: hạn mức các nhóm đã gán đang "phân bổ" cho tài khoản đó bao nhiêu, đã chi bao nhiêu
export interface AccountBudgetLine {
  accountId: number;
  name: string;
  type: 'BANK' | 'CASH';
  bankName: string | null;
  planned: number; // tổng hạn mức các nhóm đã gán
  spent: number; // tổng chi thực tế từ tài khoản trong tháng (không tính giao dịch loại khỏi thống kê)
  spentInGroups: number;
  spentOutside: number; // chi vào danh mục không thuộc nhóm nào của tài khoản (hoặc chưa phân loại)
  groups: GroupBudgetLine[];
}

export interface BudgetMonthTotals {
  month: string;
  budget: number; // tổng hạn mức hiệu lực
  spentBudgeted: number; // đã chi ở các danh mục có hạn mức
  expense: number; // tổng chi cả tháng (mọi danh mục, kể cả chưa phân loại)
}

// Dòng cấp cao nhất: tổng của chúng đã bao gồm các con nên cộng lại không bị trùng
export const topLevelLines = (lines: BudgetLine[]) => lines.filter((l) => l.parentId === null);

// "Đơn vị hạn mức" để cảnh báo/cân đối: dòng có hạn mức tự đặt, bỏ con nếu cha đã có hạn mức riêng
export function budgetUnits(lines: BudgetLine[]): BudgetLine[] {
  const own = (l: BudgetLine | undefined) => !!l && (l.source === 'MONTH' || l.source === 'DEFAULT');
  return lines.filter((l) => own(l) && (l.parentId === null || !own(lines.find((p) => p.categoryId === l.parentId))));
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

  // Trạng thái ngân sách mọi danh mục chi trong một tháng. Danh mục cha gộp số liệu của các con.
  async getBudgetStatus(month: string): Promise<BudgetLine[]> {
    const [categories, budgets, spent, prev] = await Promise.all([
      this.prisma.category.findMany({ where: { kind: 'EXPENSE' }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.budget.findMany({ where: { month: { in: [month, DEFAULT_BUDGET_MONTH] } } }),
      this.expenseByCategory(month),
      this.expenseByCategory(addMonths(month, -1)),
    ]);

    const lines: BudgetLine[] = categories.map((c) => {
      const own = budgets.find((b) => b.categoryId === c.id && b.month === month);
      const def = budgets.find((b) => b.categoryId === c.id && b.month === DEFAULT_BUDGET_MONTH);
      const eff = own ?? def;
      const amount = eff ? Number(eff.amount) : null;
      const s = spent.get(c.id);
      return {
        categoryId: c.id,
        parentId: c.parentId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        amount,
        source: own ? 'MONTH' : def ? 'DEFAULT' : null,
        defaultAmount: def ? Number(def.amount) : null,
        spent: s?.total ?? 0,
        count: s?.count ?? 0,
        prevSpent: prev.get(c.id)?.total ?? 0,
        percent: null,
      };
    });

    // Gộp con vào cha
    for (const parent of lines) {
      if (parent.parentId !== null) continue;
      const children = lines.filter((l) => l.parentId === parent.categoryId);
      if (!children.length) continue;
      parent.spent += children.reduce((s, l) => s + l.spent, 0);
      parent.count += children.reduce((s, l) => s + l.count, 0);
      parent.prevSpent += children.reduce((s, l) => s + l.prevSpent, 0);
      if (parent.amount === null) {
        const withAmount = children.filter((l) => l.amount !== null);
        if (withAmount.length) {
          parent.amount = withAmount.reduce((s, l) => s + (l.amount ?? 0), 0);
          parent.source = 'CHILDREN';
        }
      }
    }
    for (const l of lines) l.percent = l.amount && l.amount > 0 ? l.spent / l.amount : null;
    return lines;
  }

  // Tổng hạn mức / đã chi của tháng — chỉ cộng dòng cấp cao nhất để không trùng con
  totals(month: string, lines: BudgetLine[], expense: number): BudgetMonthTotals {
    const budgeted = topLevelLines(lines).filter((l) => l.amount !== null);
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

  // Dữ liệu cho trang Ngân sách: từng danh mục + thu nhập tháng + lịch sử 3 tháng gần nhất + ngân sách theo tài khoản.
  async getBudgetPage(month: string) {
    const { from, to } = monthRange(month);
    const [lines, summary, history] = await Promise.all([
      this.getBudgetStatus(month),
      this.stats.getSummary({ from, to }),
      Promise.all([addMonths(month, -2), addMonths(month, -1)].map((m) => this.monthTotals(m))),
    ]);
    const { accounts, unassignedGroups } = await this.getAccountBudgets(month, lines);
    return {
      month,
      lines,
      income: summary.income,
      expense: summary.expense,
      history: [...history, this.totals(month, lines, summary.expense)],
      accounts,
      unassignedGroups,
    };
  }

  // Ngân sách theo tài khoản: mỗi tài khoản đang hoạt động + các nhóm chi tiêu đã gán cho nó.
  // Hạn mức nhóm = tổng hạn mức hiệu lực của các danh mục cha trong nhóm (lines đã gộp con vào cha).
  async getAccountBudgets(month: string, lines: BudgetLine[]): Promise<{ accounts: AccountBudgetLine[]; unassignedGroups: GroupBudgetLine[] }> {
    const { from, to } = monthRange(month);
    const [accounts, groups, spentRows] = await Promise.all([
      this.prisma.account.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
        include: { categoryGroups: { select: { groupId: true } } },
      }),
      this.prisma.categoryGroup.findMany({
        where: { kind: 'EXPENSE' },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: { categories: { where: { parentId: null }, select: { id: true } }, accounts: { select: { accountId: true } } },
      }),
      this.stats.getExpenseByAccountCategory({ from, to }),
    ]);

    const lineById = new Map(lines.map((l) => [l.categoryId, l]));
    // Danh mục (kể cả con) → danh mục cha đứng đầu
    const topOf = (categoryId: number | null): number | null => {
      if (categoryId === null) return null;
      const l = lineById.get(categoryId);
      return l ? (l.parentId ?? l.categoryId) : null;
    };

    const groupLineFor = (g: (typeof groups)[number], accountId: number | null): GroupBudgetLine => {
      const categoryIds = g.categories.map((c) => c.id);
      const parents = categoryIds.map((id) => lineById.get(id)).filter((l): l is BudgetLine => !!l);
      const withBudget = parents.filter((l) => l.amount !== null);
      const mine = spentRows.filter((r) => (accountId === null || r.accountId === accountId) && categoryIds.includes(topOf(r.categoryId) ?? -1));
      return {
        groupId: g.id,
        name: g.name,
        icon: g.icon,
        color: g.color,
        categoryIds,
        budget: withBudget.length ? withBudget.reduce((s, l) => s + (l.amount ?? 0), 0) : null,
        spent: mine.reduce((s, r) => s + r.total, 0),
        count: mine.reduce((s, r) => s + r.count, 0),
        sharedAccounts: Math.max(0, g.accounts.length - (accountId === null ? 0 : 1)),
      };
    };

    const result: AccountBudgetLine[] = accounts.map((a) => {
      const myGroupIds = new Set(a.categoryGroups.map((x) => x.groupId));
      const myGroups = groups.filter((g) => myGroupIds.has(g.id)).map((g) => groupLineFor(g, a.id));
      const covered = new Set(myGroups.flatMap((g) => g.categoryIds));
      const rows = spentRows.filter((r) => r.accountId === a.id);
      const spent = rows.reduce((s, r) => s + r.total, 0);
      const spentInGroups = rows.filter((r) => covered.has(topOf(r.categoryId) ?? -1)).reduce((s, r) => s + r.total, 0);
      return {
        accountId: a.id,
        name: a.name,
        type: a.type,
        bankName: a.bankName,
        planned: myGroups.reduce((s, g) => s + (g.budget ?? 0), 0),
        spent,
        spentInGroups,
        spentOutside: spent - spentInGroups,
        groups: myGroups,
      };
    });

    const unassignedGroups = groups.filter((g) => g.accounts.length === 0).map((g) => groupLineFor(g, null));
    return { accounts: result, unassignedGroups };
  }

  // Lưu nhiều hạn mức trong một transaction; amount = null là xóa
  async save(items: BudgetItemDto[]) {
    const ids = [...new Set(items.map((i) => i.categoryId))];
    const cats = await this.prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true, parentId: true } });
    if (cats.length !== ids.length) throw new BadRequestException('Danh mục không tồn tại');
    if (cats.some((c) => c.kind !== 'EXPENSE')) throw new BadRequestException('Chỉ đặt ngân sách cho danh mục chi');
    await this.assertWithinParentCeiling(items, cats);

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

  // Trần của cha: tổng hạn mức hiệu lực các danh mục con không được vượt hạn mức của cha (nếu cha có đặt).
  // Kiểm tra trên trạng thái SAU khi áp các thay đổi, theo từng tháng được đụng tới ("*" = mặc định).
  private async assertWithinParentCeiling(items: BudgetItemDto[], cats: { id: number; parentId: number | null }[]) {
    const familyHeads = new Set<number>(cats.map((c) => c.parentId ?? c.id));
    const families = await this.prisma.category.findMany({
      where: { id: { in: [...familyHeads] } },
      select: { id: true, name: true, children: { select: { id: true, name: true } } },
    });
    const withChildren = families.filter((f) => f.children.length > 0);
    if (!withChildren.length) return;

    const famIds = withChildren.flatMap((f) => [f.id, ...f.children.map((c) => c.id)]);
    const months = [...new Set(items.map((i) => i.month))];
    const budgets = await this.prisma.budget.findMany({
      where: { categoryId: { in: famIds }, month: { in: [...new Set([...months, DEFAULT_BUDGET_MONTH])] } },
    });

    // (categoryId|month) → hạn mức; null = đã xóa
    const map = new Map<string, number | null>();
    for (const b of budgets) map.set(`${b.categoryId}|${b.month}`, Number(b.amount));
    for (const i of items) map.set(`${i.categoryId}|${i.month}`, i.amount);
    const eff = (categoryId: number, month: string): number | null => {
      if (month === DEFAULT_BUDGET_MONTH) return map.get(`${categoryId}|*`) ?? null;
      const own = map.get(`${categoryId}|${month}`);
      return own !== undefined && own !== null ? own : (map.get(`${categoryId}|*`) ?? null);
    };
    const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(v);

    for (const f of withChildren) {
      for (const m of months) {
        const ceiling = eff(f.id, m);
        if (ceiling === null) continue;
        const sum = f.children.reduce((s, c) => s + (eff(c.id, m) ?? 0), 0);
        if (sum > ceiling) {
          const when = m === DEFAULT_BUDGET_MONTH ? 'mặc định' : `tháng ${m.slice(5)}/${m.slice(0, 4)}`;
          throw new BadRequestException(
            `Tổng hạn mức các danh mục con của "${f.name}" (${fmt(sum)} ₫) vượt trần ${fmt(ceiling)} ₫ (${when}). Giảm hạn mức con hoặc tăng hạn mức cha.`,
          );
        }
      }
    }
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
