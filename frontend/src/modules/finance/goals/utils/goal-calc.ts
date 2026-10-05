// Bản sao rút gọn từ BE (personal-finance-nestjs/src/modules/goals/utils/goal-insights.ts) — sửa cả hai nơi.
// Dùng để form tính ngay khi đang nhập, trước khi lưu.
import { addMonths } from '@/lib/dates';

export function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return yb * 12 + mb - (ya * 12 + ma);
}

export function simulateGoal(saved: number, target: number, monthly: number, annualRatePct: number | null, maxMonths = 600) {
  if (saved >= target) return { months: 0 as number | null, interest: 0 };
  const r = annualRatePct && annualRatePct > 0 ? annualRatePct / 100 / 12 : 0;
  if (monthly <= 0 && (r === 0 || saved <= 0)) return { months: null as number | null, interest: 0 };
  let balance = saved;
  let interest = 0;
  for (let m = 1; m <= maxMonths; m++) {
    const i = Math.round(balance * r);
    interest += i;
    balance += i + Math.max(0, monthly);
    if (balance >= target) return { months: m as number | null, interest };
  }
  return { months: null as number | null, interest: 0 };
}

// Số tháng còn lại tính cả tháng hiện tại
export const monthsLeftUntil = (currentMonth: string, deadline: string) => monthDiff(currentMonth, deadline) + 1;
export const projectMonth = (currentMonth: string, months: number | null) => (months === null ? null : addMonths(currentMonth, months));
