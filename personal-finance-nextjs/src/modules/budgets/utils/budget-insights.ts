// Logic thuần cho trang Ngân sách (dùng được ở client): trạng thái, nhịp chi, gợi ý cân đối hạn mức.
import { monthRange, todayVN } from '@/lib/dates';

export interface BudgetLineLike {
  categoryId: number;
  name: string;
  amount: number | null;
  spent: number;
  percent: number | null;
}

export type BudgetState = 'over' | 'near' | 'ok' | 'unused' | 'none';

export const NEAR_THRESHOLD = 0.8; // từ 80% hạn mức là "sắp chạm" (đồng bộ với cảnh báo ở Tổng quan)

export function budgetState(l: BudgetLineLike): BudgetState {
  if (l.amount === null) return 'none';
  if (l.spent > l.amount) return 'over';
  if (l.amount > 0 && l.spent / l.amount >= NEAR_THRESHOLD) return 'near';
  if (l.spent === 0) return 'unused';
  return 'ok';
}

const STATE_ORDER: Record<BudgetState, number> = { over: 0, near: 1, ok: 2, unused: 3, none: 4 };

// Vượt → sắp chạm → an toàn → chưa tiêu → chưa đặt; cùng nhóm thì % cao trước
export function sortByState<T extends BudgetLineLike>(lines: T[]): T[] {
  return [...lines].sort(
    (a, b) => STATE_ORDER[budgetState(a)] - STATE_ORDER[budgetState(b)] || (b.percent ?? 0) - (a.percent ?? 0)
  );
}

export interface MonthClock {
  phase: 'past' | 'current' | 'future';
  daysInMonth: number;
  elapsed: number; // số ngày đã qua (tính cả hôm nay)
  daysLeft: number; // số ngày còn lại sau hôm nay
  timePct: number; // 0..1
}

export function monthClock(month: string, today = todayVN()): MonthClock {
  const { from, to } = monthRange(month);
  const daysInMonth = Number(to.slice(8, 10));
  if (today < from) return { phase: 'future', daysInMonth, elapsed: 0, daysLeft: daysInMonth, timePct: 0 };
  if (today > to) return { phase: 'past', daysInMonth, elapsed: daysInMonth, daysLeft: 0, timePct: 1 };
  const elapsed = Number(today.slice(8, 10));
  return { phase: 'current', daysInMonth, elapsed, daysLeft: daysInMonth - elapsed, timePct: elapsed / daysInMonth };
}

// Dự kiến chi cả tháng nếu giữ nhịp hiện tại
export function projectedSpend(spent: number, clock: MonthClock): number {
  if (clock.phase !== 'current' || clock.timePct <= 0) return spent;
  return spent / clock.timePct;
}

export interface RebalanceMove {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
}

export interface RebalancePlan {
  deficit: number; // tổng số tiền đã vượt
  covered: number; // phần có thể bù từ danh mục khác
  moves: RebalanceMove[];
  // Hạn mức mới (riêng tháng này) sau khi áp dụng
  updates: { categoryId: number; amount: number }[];
}

const roundUp = (v: number, step: number) => Math.ceil(v / step) * step;
const roundDown = (v: number, step: number) => Math.floor(v / step) * step;

// Gợi ý dời hạn mức từ danh mục dự kiến còn dư (theo nhịp chi hiện tại) sang danh mục đã vượt.
// Quy tắc đơn giản, có thể giải thích: không dự đoán gì ngoài "giữ nguyên nhịp chi đến cuối tháng".
export function suggestRebalance(lines: BudgetLineLike[], clock: MonthClock, step = 10_000): RebalancePlan | null {
  if (clock.phase !== 'current') return null;
  const overs = lines
    .filter((l) => l.amount !== null && l.spent > l.amount)
    .map((l) => ({ l, need: roundUp(l.spent - (l.amount as number), step) }))
    .sort((a, b) => b.need - a.need);
  if (!overs.length) return null;

  const donors = lines
    .filter((l) => l.amount !== null && l.spent <= l.amount)
    .map((l) => {
      const projected = Math.max(l.spent, projectedSpend(l.spent, clock));
      return { l, slack: roundDown((l.amount as number) - projected, step) };
    })
    .filter((d) => d.slack >= step)
    .sort((a, b) => b.slack - a.slack);

  const moves: RebalanceMove[] = [];
  for (const o of overs) {
    let need = o.need;
    for (const d of donors) {
      if (need <= 0) break;
      if (d.slack <= 0) continue;
      const amt = Math.min(need, d.slack);
      moves.push({ fromId: d.l.categoryId, fromName: d.l.name, toId: o.l.categoryId, toName: o.l.name, amount: amt });
      d.slack -= amt;
      need -= amt;
    }
  }

  const delta = new Map<number, number>();
  for (const m of moves) {
    delta.set(m.fromId, (delta.get(m.fromId) ?? 0) - m.amount);
    delta.set(m.toId, (delta.get(m.toId) ?? 0) + m.amount);
  }
  const updates = [...delta.entries()].map(([categoryId, d]) => ({
    categoryId,
    amount: (lines.find((l) => l.categoryId === categoryId)!.amount as number) + d,
  }));

  const deficit = overs.reduce((s, o) => s + o.need, 0);
  const covered = moves.reduce((s, m) => s + m.amount, 0);
  return { deficit, covered, moves, updates };
}
