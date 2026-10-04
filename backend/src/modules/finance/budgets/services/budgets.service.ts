import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { addMonths, monthRange } from '../../../../common/utils/dates.util';
import { SettingsService } from '../../../../services/settings.service';
import { StatsService } from '../../stats/services/stats.service';
import type { BudgetItemDto } from '../dto/budget.dto';
import { budgetTotalsOf, categoriesBudgetOf } from '../utils/budget-math';

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
  // Hạn mức riêng của nhóm nếu có, không thì tổng hạn mức hiệu lực của các danh mục cha (null = chưa đặt)
  budget: number | null;
  spent: number; // đã chi từ tài khoản này vào các danh mục của nhóm (kể cả con)
  count: number;
  sharedAccounts: number; // số tài khoản khác cũng gán nhóm này (hạn mức nhóm bị tính ở nhiều tài khoản)
}

// Hạn mức của cả một nhóm chi tiêu trong tháng (trần chung cho mọi danh mục trong nhóm)
export interface GroupBudgetStatus {
  groupId: number;
  name: string;
  icon: string;
  color: string;
  categoryIds: number[]; // danh mục cha trong nhóm
  // Hạn mức riêng của nhóm hiệu lực trong tháng (null = chưa đặt)
  amount: number | null;
  source: 'MONTH' | 'DEFAULT' | null;
  defaultAmount: number | null;
  // Tổng hạn mức đã đặt cho các danh mục trong nhóm (để so với trần nhóm); null = chưa danh mục nào đặt
  categoriesBudget: number | null;
  spent: number; // đã chi vào mọi danh mục của nhóm (kể cả con)
  count: number;
  prevSpent: number;
  percent: number | null;
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
    private readonly settings: SettingsService,
  ) {}

  // Khoảng ngày của một tháng theo ngày bắt đầu tháng trong cài đặt (VD ngày lương 5: 05/10 → 04/11)
  private async range(month: string) {
    return monthRange(month, await this.settings.monthStartDay());
  }

  private async expenseByCategory(month: string) {
    const { from, to } = await this.range(month);
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

  // Hạn mức của từng nhóm chi tiêu trong tháng. `lines` đã gộp con vào cha nên số đã chi của nhóm = tổng các danh mục cha.
  async getGroupBudgetStatus(month: string, lines: BudgetLine[]): Promise<GroupBudgetStatus[]> {
    const groups = await this.prisma.categoryGroup.findMany({
      where: { kind: 'EXPENSE' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        categories: { where: { parentId: null }, select: { id: true } },
        budgets: { where: { month: { in: [month, DEFAULT_BUDGET_MONTH] } } },
      },
    });
    const lineById = new Map(lines.map((l) => [l.categoryId, l]));
    return groups.map((g) => {
      const own = g.budgets.find((b) => b.month === month);
      const def = g.budgets.find((b) => b.month === DEFAULT_BUDGET_MONTH);
      const eff = own ?? def;
      const amount = eff ? Number(eff.amount) : null;
      const categoryIds = g.categories.map((c) => c.id);
      const parents = categoryIds.map((id) => lineById.get(id)).filter((l): l is BudgetLine => !!l);
      const spent = parents.reduce((s, l) => s + l.spent, 0);
      return {
        groupId: g.id,
        name: g.name,
        icon: g.icon,
        color: g.color,
        categoryIds,
        amount,
        source: own ? 'MONTH' : def ? 'DEFAULT' : null,
        defaultAmount: def ? Number(def.amount) : null,
        // Dòng cha đã mang hạn mức hiệu lực (riêng của cha hoặc tổng các con)
        categoriesBudget: categoriesBudgetOf(parents.map((l) => ({ own: l.amount, children: [] }))),
        spent,
        count: parents.reduce((s, l) => s + l.count, 0),
        prevSpent: parents.reduce((s, l) => s + l.prevSpent, 0),
        percent: amount && amount > 0 ? spent / amount : null,
      };
    });
  }

  // Trạng thái danh mục + nhóm của một tháng
  async getMonthStatus(month: string): Promise<{ lines: BudgetLine[]; groups: GroupBudgetStatus[] }> {
    const lines = await this.getBudgetStatus(month);
    return { lines, groups: await this.getGroupBudgetStatus(month, lines) };
  }

  // Tổng hạn mức / đã chi của tháng: nhóm có hạn mức riêng tính theo nhóm, còn lại theo danh mục cha (không trùng con)
  totals(month: string, lines: BudgetLine[], expense: number, groups: GroupBudgetStatus[] = []): BudgetMonthTotals {
    return { month, ...budgetTotalsOf(lines, groups), expense };
  }

  private async monthTotals(month: string): Promise<BudgetMonthTotals> {
    const { from, to } = await this.range(month);
    const [{ lines, groups }, summary] = await Promise.all([this.getMonthStatus(month), this.stats.getSummary({ from, to })]);
    return this.totals(month, lines, summary.expense, groups);
  }

  // Dữ liệu cho trang Ngân sách: từng danh mục + thu nhập tháng + lịch sử 3 tháng gần nhất + ngân sách theo tài khoản.
  async getBudgetPage(month: string) {
    const monthStartDay = await this.settings.monthStartDay();
    const range = monthRange(month, monthStartDay);
    const [{ lines, groups }, summary, history] = await Promise.all([
      this.getMonthStatus(month),
      this.stats.getSummary(range),
      Promise.all([addMonths(month, -2), addMonths(month, -1)].map((m) => this.monthTotals(m))),
    ]);
    const { accounts, unassignedGroups } = await this.getAccountBudgets(month, lines, groups);
    return {
      month,
      // Khoảng ngày thực của tháng này theo cài đặt ngày bắt đầu tháng
      range,
      monthStartDay,
      lines,
      groups,
      income: summary.income,
      expense: summary.expense,
      history: [...history, this.totals(month, lines, summary.expense, groups)],
      accounts,
      unassignedGroups,
    };
  }

  // Ngân sách theo tài khoản: mỗi tài khoản đang hoạt động + các nhóm chi tiêu đã gán cho nó.
  // Hạn mức nhóm = hạn mức riêng của nhóm nếu có, không thì tổng hạn mức hiệu lực của các danh mục cha (lines đã gộp con vào cha).
  async getAccountBudgets(
    month: string,
    lines: BudgetLine[],
    groupStatus: GroupBudgetStatus[] = [],
  ): Promise<{ accounts: AccountBudgetLine[]; unassignedGroups: GroupBudgetLine[] }> {
    const { from, to } = await this.range(month);
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
    const ownGroupBudget = new Map(groupStatus.filter((g) => g.amount !== null).map((g) => [g.groupId, g.amount as number]));
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
        budget: ownGroupBudget.get(g.id) ?? (withBudget.length ? withBudget.reduce((s, l) => s + (l.amount ?? 0), 0) : null),
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

  // Lưu nhiều hạn mức (danh mục hoặc nhóm) trong một transaction; amount = null là xóa
  async save(items: BudgetItemDto[]) {
    if (items.some((i) => (i.categoryId === undefined) === (i.groupId === undefined))) {
      throw new BadRequestException('Mỗi hạn mức phải có đúng một trong categoryId hoặc groupId');
    }
    const catItems = items.filter((i) => i.categoryId !== undefined) as (BudgetItemDto & { categoryId: number })[];
    const groupItems = items.filter((i) => i.groupId !== undefined) as (BudgetItemDto & { groupId: number })[];

    const ids = [...new Set(catItems.map((i) => i.categoryId))];
    const cats = await this.prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true, parentId: true } });
    if (cats.length !== ids.length) throw new BadRequestException('Danh mục không tồn tại');
    if (cats.some((c) => c.kind !== 'EXPENSE')) throw new BadRequestException('Chỉ đặt ngân sách cho danh mục chi');

    const groupIds = [...new Set(groupItems.map((i) => i.groupId))];
    const groups = await this.prisma.categoryGroup.findMany({ where: { id: { in: groupIds } }, select: { id: true, kind: true } });
    if (groups.length !== groupIds.length) throw new BadRequestException('Nhóm không tồn tại');
    if (groups.some((g) => g.kind !== 'EXPENSE')) throw new BadRequestException('Chỉ đặt ngân sách cho nhóm chi tiêu');

    if (catItems.length) await this.assertWithinParentCeiling(catItems, cats);
    await this.assertWithinGroupCeiling(catItems, groupItems, cats);

    await this.prisma.$transaction([
      ...catItems.map(({ categoryId, month, amount }) =>
        amount === null
          ? this.prisma.budget.deleteMany({ where: { categoryId, month } })
          : this.prisma.budget.upsert({
              where: { categoryId_month: { categoryId, month } },
              update: { amount: BigInt(amount) },
              create: { categoryId, month, amount: BigInt(amount) },
            }),
      ),
      ...groupItems.map(({ groupId, month, amount }) =>
        amount === null
          ? this.prisma.groupBudget.deleteMany({ where: { groupId, month } })
          : this.prisma.groupBudget.upsert({
              where: { groupId_month: { groupId, month } },
              update: { amount: BigInt(amount) },
              create: { groupId, month, amount: BigInt(amount) },
            }),
      ),
    ]);
    return { ok: true, saved: items.length };
  }

  // Trần của nhóm: tổng hạn mức các danh mục cha trong nhóm (cha chưa đặt thì lấy tổng các con) không được vượt hạn mức nhóm.
  // Kiểm tra trên trạng thái SAU khi áp các thay đổi, theo từng tháng được đụng tới ("*" = mặc định).
  private async assertWithinGroupCeiling(
    catItems: (BudgetItemDto & { categoryId: number })[],
    groupItems: (BudgetItemDto & { groupId: number })[],
    cats: { id: number; parentId: number | null }[],
  ) {
    // Nhóm bị ảnh hưởng: nhóm được sửa trực tiếp + nhóm chứa danh mục (cha của danh mục con) được sửa
    const heads = [...new Set(cats.map((c) => c.parentId ?? c.id))];
    const headGroups = heads.length
      ? await this.prisma.category.findMany({ where: { id: { in: heads }, groupId: { not: null } }, select: { groupId: true } })
      : [];
    const groupIds = [...new Set([...groupItems.map((i) => i.groupId), ...headGroups.map((c) => c.groupId as number)])];
    if (!groupIds.length) return;

    const groups = await this.prisma.categoryGroup.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true, categories: { where: { parentId: null }, select: { id: true, children: { select: { id: true } } } } },
    });
    const months = [...new Set([...catItems, ...groupItems].map((i) => i.month))];
    const monthSet = [...new Set([...months, DEFAULT_BUDGET_MONTH])];
    const famIds = groups.flatMap((g) => g.categories.flatMap((c) => [c.id, ...c.children.map((x) => x.id)]));
    const [budgets, groupBudgets] = await Promise.all([
      this.prisma.budget.findMany({ where: { categoryId: { in: famIds }, month: { in: monthSet } } }),
      this.prisma.groupBudget.findMany({ where: { groupId: { in: groupIds }, month: { in: monthSet } } }),
    ]);

    // Khóa "c|id|tháng" hoặc "g|id|tháng" → hạn mức; null = đã xóa
    const map = new Map<string, number | null>();
    for (const b of budgets) map.set(`c|${b.categoryId}|${b.month}`, Number(b.amount));
    for (const b of groupBudgets) map.set(`g|${b.groupId}|${b.month}`, Number(b.amount));
    for (const i of catItems) map.set(`c|${i.categoryId}|${i.month}`, i.amount);
    for (const i of groupItems) map.set(`g|${i.groupId}|${i.month}`, i.amount);
    const eff = (kind: 'c' | 'g', id: number, month: string): number | null => {
      if (month === DEFAULT_BUDGET_MONTH) return map.get(`${kind}|${id}|*`) ?? null;
      const own = map.get(`${kind}|${id}|${month}`);
      return own !== undefined && own !== null ? own : (map.get(`${kind}|${id}|*`) ?? null);
    };
    const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(v);

    for (const g of groups) {
      for (const m of months) {
        const ceiling = eff('g', g.id, m);
        if (ceiling === null) continue;
        const sum =
          categoriesBudgetOf(g.categories.map((c) => ({ own: eff('c', c.id, m), children: c.children.map((x) => eff('c', x.id, m)) }))) ?? 0;
        if (sum > ceiling) {
          const when = m === DEFAULT_BUDGET_MONTH ? 'mặc định' : `tháng ${m.slice(5)}/${m.slice(0, 4)}`;
          throw new BadRequestException(
            `Tổng hạn mức các danh mục trong nhóm "${g.name}" (${fmt(sum)} ₫) vượt hạn mức nhóm ${fmt(ceiling)} ₫ (${when}). Giảm hạn mức danh mục hoặc tăng hạn mức nhóm.`,
          );
        }
      }
    }
  }

  // Trần của cha: tổng hạn mức hiệu lực các danh mục con không được vượt hạn mức của cha (nếu cha có đặt).
  // Kiểm tra trên trạng thái SAU khi áp các thay đổi, theo từng tháng được đụng tới ("*" = mặc định).
  private async assertWithinParentCeiling(items: (BudgetItemDto & { categoryId: number })[], cats: { id: number; parentId: number | null }[]) {
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

  // Sao chép hạn mức đặt riêng (danh mục và nhóm) của tháng trước sang tháng này (ghi đè nếu đã có)
  async copyFromPreviousMonth(month: string) {
    const prevMonth = addMonths(month, -1);
    const [prev, prevGroups] = await Promise.all([
      this.prisma.budget.findMany({ where: { month: prevMonth } }),
      this.prisma.groupBudget.findMany({ where: { month: prevMonth } }),
    ]);
    await this.prisma.$transaction([
      ...prev.map((b) =>
        this.prisma.budget.upsert({
          where: { categoryId_month: { categoryId: b.categoryId, month } },
          update: { amount: b.amount },
          create: { categoryId: b.categoryId, month, amount: b.amount },
        }),
      ),
      ...prevGroups.map((b) =>
        this.prisma.groupBudget.upsert({
          where: { groupId_month: { groupId: b.groupId, month } },
          update: { amount: b.amount },
          create: { groupId: b.groupId, month, amount: b.amount },
        }),
      ),
    ]);
    return { copied: prev.length + prevGroups.length };
  }
}
