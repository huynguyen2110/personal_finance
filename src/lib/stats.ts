import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { endOfVNDayExclusive, monthRange, startOfVNDay } from './dates';
import { EMAIL_PROVIDERS } from './email/providers';

// Mọi thống kê: bỏ qua giao dịch excludeFromStats, gom nhóm theo giờ Việt Nam.
// Prisma lưu DateTime ở UTC → cộng 7 giờ trước khi lấy ngày/tháng.
const VN_DATE = Prisma.sql`DATE_ADD(t.transactionDate, INTERVAL 7 HOUR)`;

export interface StatsScope {
  from: string; // YYYY-MM-DD (VN)
  to: string; // YYYY-MM-DD (VN), bao gồm
  accountId?: number | null;
}

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

export interface Summary {
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  savingsRate: number | null; // (thu - chi) / thu
}

export async function getSummary(s: StatsScope): Promise<Summary> {
  const rows = await prisma.$queryRaw<{ direction: 'IN' | 'OUT'; total: bigint; cnt: bigint }[]>`
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

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export async function getMonthly(s: StatsScope): Promise<MonthlyPoint[]> {
  const rows = await prisma.$queryRaw<{ month: string; direction: 'IN' | 'OUT'; total: bigint }[]>`
    SELECT DATE_FORMAT(${VN_DATE}, '%Y-%m') AS month, t.direction, CAST(SUM(t.amount) AS SIGNED) AS total
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

export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
}

export async function getDaily(s: StatsScope): Promise<DailyPoint[]> {
  const rows = await prisma.$queryRaw<{ d: string; direction: 'IN' | 'OUT'; total: bigint }[]>`
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

export interface CategoryTotal {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
}

export async function getByCategory(s: StatsScope, direction: 'IN' | 'OUT'): Promise<CategoryTotal[]> {
  const rows = await prisma.$queryRaw<
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

export interface WeekdayPoint {
  weekday: number; // 0 = Chủ nhật … 6 = Thứ 7
  expense: number;
  count: number;
}

export async function getWeekday(s: StatsScope): Promise<WeekdayPoint[]> {
  // DAYOFWEEK: 1 = CN … 7 = T7
  const rows = await prisma.$queryRaw<{ wd: number; total: bigint; cnt: bigint }[]>`
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

export interface CategoryMonthCell {
  categoryId: number | null;
  month: string;
  total: number;
}

export async function getCategoryMonthMatrix(
  s: StatsScope,
  direction: 'IN' | 'OUT'
): Promise<CategoryMonthCell[]> {
  const rows = await prisma.$queryRaw<{ categoryId: number | null; month: string; total: bigint }[]>`
    SELECT t.categoryId, DATE_FORMAT(${VN_DATE}, '%Y-%m') AS month, CAST(SUM(t.amount) AS SIGNED) AS total
    FROM \`Transaction\` t
    WHERE ${scopeWhere(s)} AND t.direction = ${direction}
    GROUP BY t.categoryId, month`;
  return rows.map((r) => ({ categoryId: r.categoryId, month: r.month, total: n(r.total) }));
}

// Chi tiêu theo danh mục trong một tháng (dùng cho ngân sách)
export async function getMonthExpenseByCategory(month: string): Promise<Map<number | null, number>> {
  const { from, to } = monthRange(month);
  const rows = await getByCategory({ from, to }, 'OUT');
  return new Map(rows.map((r) => [r.categoryId, r.total]));
}

// Cách web ghi nhận giao dịch của một tài khoản (để giải thích độ đầy đủ của số dư)
function trackingOf(a: { type: 'BANK' | 'CASH'; bankName: string | null }) {
  if (a.type === 'CASH') return { method: 'MANUAL' as const, label: 'Nhập tay', in: true, out: true };
  const p = EMAIL_PROVIDERS.find((x) => x.bankName.toLowerCase() === (a.bankName ?? '').toLowerCase());
  if (p) return { method: 'EMAIL' as const, label: `Email ${p.bankName}`, in: p.covers.in, out: p.covers.out };
  return { method: 'MANUAL' as const, label: 'Nhập tay', in: true, out: true };
}

// Số dư mỗi tài khoản (tính cả giao dịch bị loại khỏi thống kê):
// - ngân hàng có báo số dư (VD email ACB): số dư báo gần nhất + các giao dịch phát sinh sau đó
// - còn lại: số dư đầu kỳ + tổng thu − tổng chi
export async function getAccountBalances() {
  const [accounts, sums, after] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ type: 'asc' }, { id: 'asc' }] }),
    prisma.$queryRaw<{ accountId: number; direction: 'IN' | 'OUT'; total: bigint; cnt: bigint }[]>`
      SELECT t.accountId, t.direction, CAST(SUM(t.amount) AS SIGNED) AS total, COUNT(*) AS cnt
      FROM \`Transaction\` t
      GROUP BY t.accountId, t.direction`,
    prisma.$queryRaw<{ accountId: number; direction: 'IN' | 'OUT'; total: bigint }[]>`
      SELECT t.accountId, t.direction, CAST(SUM(t.amount) AS SIGNED) AS total
      FROM \`Transaction\` t
      JOIN Account a ON a.id = t.accountId
      WHERE a.bankBalanceAt IS NOT NULL AND t.transactionDate > a.bankBalanceAt
      GROUP BY t.accountId, t.direction`,
  ]);
  const sumOf = (rows: { accountId: number; direction: 'IN' | 'OUT'; total: bigint }[], id: number, d: 'IN' | 'OUT') =>
    n(rows.find((s) => s.accountId === id && s.direction === d)?.total);

  return accounts.map((a) => {
    const cnt = sums.filter((s) => s.accountId === a.id).reduce((acc, s) => acc + n(s.cnt), 0);
    const reported = a.bankBalance !== null && a.bankBalanceAt !== null;
    const balance = reported
      ? n(a.bankBalance) + sumOf(after, a.id, 'IN') - sumOf(after, a.id, 'OUT')
      : n(a.openingBalance) + sumOf(sums, a.id, 'IN') - sumOf(sums, a.id, 'OUT');
    return {
      ...a,
      openingBalance: n(a.openingBalance),
      bankBalance: a.bankBalance === null ? null : n(a.bankBalance),
      balance,
      balanceSource: reported ? ('BANK' as const) : ('COMPUTED' as const),
      tracking: trackingOf(a),
      transactionCount: cnt,
    };
  });
}
