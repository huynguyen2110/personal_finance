import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { endOfVNDayExclusive, startOfVNDay } from '../../../common/utils/dates.util';
import type {
  CategoryMonthCell,
  CategoryTotal,
  DailyPoint,
  MonthlyPoint,
  StatsScope,
  Summary,
  WeekdayPoint,
} from '../types/stats.types';

// Mọi thống kê: bỏ qua giao dịch excludeFromStats, gom nhóm theo giờ Việt Nam.
// Prisma lưu DateTime ở UTC → cộng 7 giờ trước khi lấy ngày/tháng.
const VN_DATE = Prisma.sql`DATE_ADD(t.transactionDate, INTERVAL 7 HOUR)`;

// "Tháng" của một giao dịch theo tháng tài chính: lùi (startDay − 1) ngày rồi lấy YYYY-MM.
// VD startDay = 5: 05/10 → 01/10 → "2026-10"; 04/11 → 31/10 → "2026-10"; 04/10 → 30/09 → "2026-09".
const monthExpr = (s: StatsScope) => Prisma.sql`DATE_FORMAT(DATE_SUB(${VN_DATE}, INTERVAL ${(s.monthStartDay ?? 1) - 1} DAY), '%Y-%m')`;

function scopeWhere(s: StatsScope): Prisma.Sql {
  const parts = [
    Prisma.sql`t.excludeFromStats = false`,
    Prisma.sql`t.transactionDate >= ${startOfVNDay(s.from)}`,
    Prisma.sql`t.transactionDate < ${endOfVNDayExclusive(s.to)}`,
  ];
  if (s.accountId) parts.push(Prisma.sql`t.accountId = ${s.accountId}`);
  return Prisma.join(parts, ' AND ');
}

const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

export interface AccountCategoryTotal {
  accountId: number;
  categoryId: number | null;
  total: number;
  count: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(s: StatsScope): Promise<Summary> {
    const rows = await this.prisma.$queryRaw<{ direction: 'IN' | 'OUT'; total: bigint; cnt: bigint }[]>`
      SELECT t.direction, CAST(SUM(t.amount) AS SIGNED) AS total, COUNT(*) AS cnt
      FROM \`Transaction\` t
      WHERE ${scopeWhere(s)}
      GROUP BY t.direction`;
    const inc = rows.find((r) => r.direction === 'IN');
    const exp = rows.find((r) => r.direction === 'OUT');
    const income = n(inc?.total);
    const expense = n(exp?.total);
    return {
      income,
      expense,
      net: income - expense,
      incomeCount: n(inc?.cnt),
      expenseCount: n(exp?.cnt),
      savingsRate: income > 0 ? (income - expense) / income : null,
    };
  }

  async getMonthly(s: StatsScope): Promise<MonthlyPoint[]> {
    const rows = await this.prisma.$queryRaw<{ month: string; direction: 'IN' | 'OUT'; total: bigint }[]>`
      SELECT ${monthExpr(s)} AS month, t.direction, CAST(SUM(t.amount) AS SIGNED) AS total
      FROM \`Transaction\` t
      WHERE ${scopeWhere(s)}
      GROUP BY month, t.direction`;
    const map = new Map<string, MonthlyPoint>();
    for (const r of rows) {
      const p = map.get(r.month) ?? { month: r.month, income: 0, expense: 0 };
      if (r.direction === 'IN') p.income = n(r.total);
      else p.expense = n(r.total);
      map.set(r.month, p);
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }

  async getDaily(s: StatsScope): Promise<DailyPoint[]> {
    const rows = await this.prisma.$queryRaw<{ d: string; direction: 'IN' | 'OUT'; total: bigint }[]>`
      SELECT DATE_FORMAT(${VN_DATE}, '%Y-%m-%d') AS d, t.direction, CAST(SUM(t.amount) AS SIGNED) AS total
      FROM \`Transaction\` t
      WHERE ${scopeWhere(s)}
      GROUP BY d, t.direction`;
    const map = new Map<string, DailyPoint>();
    for (const r of rows) {
      const p = map.get(r.d) ?? { date: r.d, income: 0, expense: 0 };
      if (r.direction === 'IN') p.income = n(r.total);
      else p.expense = n(r.total);
      map.set(r.d, p);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Tổng chi theo (tài khoản, danh mục) — dùng cho ngân sách phân bổ theo tài khoản
  async getExpenseByAccountCategory(s: StatsScope): Promise<AccountCategoryTotal[]> {
    const rows = await this.prisma.$queryRaw<{ accountId: number; categoryId: number | null; total: bigint; cnt: bigint }[]>`
      SELECT t.accountId, t.categoryId, CAST(SUM(t.amount) AS SIGNED) AS total, COUNT(*) AS cnt
      FROM \`Transaction\` t
      WHERE ${scopeWhere(s)} AND t.direction = 'OUT'
      GROUP BY t.accountId, t.categoryId`;
    return rows.map((r) => ({ accountId: r.accountId, categoryId: r.categoryId, total: n(r.total), count: n(r.cnt) }));
  }

  async getByCategory(s: StatsScope, direction: 'IN' | 'OUT'): Promise<CategoryTotal[]> {
    const rows = await this.prisma.$queryRaw<
      { categoryId: number | null; name: string | null; color: string | null; icon: string | null; total: bigint; cnt: bigint }[]
    >`
      SELECT t.categoryId, c.name, c.color, c.icon, CAST(SUM(t.amount) AS SIGNED) AS total, COUNT(*) AS cnt
      FROM \`Transaction\` t
      LEFT JOIN Category c ON c.id = t.categoryId
      WHERE ${scopeWhere(s)} AND t.direction = ${direction}
      GROUP BY t.categoryId, c.name, c.color, c.icon
      ORDER BY total DESC`;
    return rows.map((r) => ({
      categoryId: r.categoryId,
      name: r.name ?? 'Chưa phân loại',
      color: r.color ?? '#94A3B8',
      icon: r.icon ?? 'CircleHelp',
      total: n(r.total),
      count: n(r.cnt),
    }));
  }

  async getWeekday(s: StatsScope): Promise<WeekdayPoint[]> {
    // DAYOFWEEK: 1 = CN … 7 = T7
    const rows = await this.prisma.$queryRaw<{ wd: number; total: bigint; cnt: bigint }[]>`
      SELECT DAYOFWEEK(${VN_DATE}) AS wd, CAST(SUM(t.amount) AS SIGNED) AS total, COUNT(*) AS cnt
      FROM \`Transaction\` t
      WHERE ${scopeWhere(s)} AND t.direction = 'OUT'
      GROUP BY wd`;
    const out: WeekdayPoint[] = Array.from({ length: 7 }, (_, i) => ({ weekday: i, expense: 0, count: 0 }));
    for (const r of rows) {
      const i = n(r.wd) - 1;
      out[i] = { weekday: i, expense: n(r.total), count: n(r.cnt) };
    }
    return out;
  }

  async getCategoryMonthMatrix(s: StatsScope, direction: 'IN' | 'OUT'): Promise<CategoryMonthCell[]> {
    const rows = await this.prisma.$queryRaw<{ categoryId: number | null; month: string; total: bigint }[]>`
      SELECT t.categoryId, ${monthExpr(s)} AS month, CAST(SUM(t.amount) AS SIGNED) AS total
      FROM \`Transaction\` t
      WHERE ${scopeWhere(s)} AND t.direction = ${direction}
      GROUP BY t.categoryId, month`;
    return rows.map((r) => ({ categoryId: r.categoryId, month: r.month, total: n(r.total) }));
  }
}
