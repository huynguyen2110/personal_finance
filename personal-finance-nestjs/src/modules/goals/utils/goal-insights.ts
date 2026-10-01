import { addMonths } from '../../../common/utils/dates.util';

// Tính toán thuần cho mục tiêu tiết kiệm (không đụng DB) — có test riêng.

export type GoalStatus =
  | 'done' // đã đạt số tiền mục tiêu
  | 'overdue' // quá hạn mà chưa đạt
  | 'on_track' // với tốc độ nạp hiện tại sẽ đạt trước hạn
  | 'behind' // với tốc độ nạp hiện tại sẽ trễ hạn
  | 'no_deadline' // không đặt hạn, đang có tốc độ nạp
  | 'no_plan'; // không đặt hạn, chưa có tốc độ nạp

export type GoalHorizon = 'short' | 'long' | null;

// Số tháng từ a → b ("YYYY-MM"); b trước a thì âm
export function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return yb * 12 + mb - (ya * 12 + ma);
}

// Mô phỏng từng tháng: lãi nhập gốc hàng tháng (lãi suất năm / 12) + nạp đều `monthly`.
// Trả về số tháng cần để số dư ≥ mục tiêu và tổng tiền lãi trong khoảng đó.
// null = không bao giờ đạt (không nạp, không lãi) hoặc quá 50 năm.
export function simulateGoal(
  saved: number,
  target: number,
  monthly: number,
  annualRatePct: number | null,
  maxMonths = 600,
): { months: number | null; interest: number } {
  if (saved >= target) return { months: 0, interest: 0 };
  const r = annualRatePct && annualRatePct > 0 ? annualRatePct / 100 / 12 : 0;
  if (monthly <= 0 && (r === 0 || saved <= 0)) return { months: null, interest: 0 };
  let balance = saved;
  let interest = 0;
  for (let m = 1; m <= maxMonths; m++) {
    const i = Math.round(balance * r);
    interest += i;
    balance += i + Math.max(0, monthly);
    if (balance >= target) return { months: m, interest };
  }
  return { months: null, interest: 0 };
}

// Số tháng còn lại tính cả tháng hiện tại (hạn tháng 12, đang tháng 10 → 3 lần nạp: T10, T11, T12)
export function monthsLeftUntil(currentMonth: string, deadline: string): number {
  return monthDiff(currentMonth, deadline) + 1;
}

export function goalStatus(p: {
  saved: number;
  target: number;
  deadline: string | null;
  currentMonth: string;
  projectedMonth: string | null;
  monthlyRate: number;
}): GoalStatus {
  if (p.saved >= p.target) return 'done';
  if (p.deadline) {
    if (p.deadline < p.currentMonth) return 'overdue';
    return p.projectedMonth !== null && p.projectedMonth <= p.deadline ? 'on_track' : 'behind';
  }
  return p.monthlyRate > 0 ? 'no_deadline' : 'no_plan';
}

// Ngắn hạn/dài hạn theo hạn đặt ra, không có hạn thì theo ngày dự kiến đạt
export function goalHorizon(currentMonth: string, deadline: string | null, projectedMonths: number | null): GoalHorizon {
  const months = deadline ? monthDiff(currentMonth, deadline) : projectedMonths;
  if (months === null) return null;
  return months > 12 ? 'long' : 'short';
}

export function projectMonth(currentMonth: string, months: number | null): string | null {
  return months === null ? null : addMonths(currentMonth, months);
}

// Kỷ luật nạp tiền: thực nạp / kế hoạch trong 3 tháng gần nhất
export function disciplineGrade(ratio: number): 'A+' | 'A' | 'B' | 'C' | 'D' {
  if (ratio >= 1) return 'A+';
  if (ratio >= 0.85) return 'A';
  if (ratio >= 0.7) return 'B';
  if (ratio >= 0.5) return 'C';
  return 'D';
}

// Các tháng (tối đa `limit`) dùng để chấm kỷ luật của một mục tiêu: bỏ tháng tạo (chưa trọn tháng),
// tính tháng hiện tại chỉ khi đã qua ngày nạp định kỳ.
export function disciplineMonths(createdMonth: string, currentMonth: string, planDayPassed: boolean, limit = 3): string[] {
  const out: string[] = [];
  if (planDayPassed && currentMonth > createdMonth) out.push(currentMonth);
  let m = addMonths(currentMonth, -1);
  while (out.length < limit && m > createdMonth) {
    out.push(m);
    m = addMonths(m, -1);
  }
  return out;
}

// ─── Sức khỏe tài chính ───
// Điểm 0–100 = trung bình có trọng số của các yếu tố có dữ liệu (yếu tố thiếu dữ liệu thì bỏ, chia lại trọng số).

export const EMERGENCY_TARGET_MONTHS = 6; // quỹ khẩn cấp nên đủ 6 tháng chi tiêu
export const GOOD_SAVINGS_RATE = 0.2; // để dành ≥ 20% thu nhập là tốt

export type HealthFactorKey = 'emergency' | 'savingsRate' | 'discipline' | 'onTrack';

export interface HealthFactor {
  key: HealthFactorKey;
  weight: number;
  score: number | null; // 0..1; null = chưa đủ dữ liệu
}

export const HEALTH_WEIGHTS: Record<HealthFactorKey, number> = { emergency: 35, savingsRate: 30, discipline: 20, onTrack: 15 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function healthFactors(p: {
  emergencyMonths: number | null;
  savingsRate: number | null;
  disciplineRatio: number | null;
  onTrack: { ok: number; total: number };
}): HealthFactor[] {
  return [
    { key: 'emergency', weight: HEALTH_WEIGHTS.emergency, score: p.emergencyMonths === null ? null : clamp01(p.emergencyMonths / EMERGENCY_TARGET_MONTHS) },
    { key: 'savingsRate', weight: HEALTH_WEIGHTS.savingsRate, score: p.savingsRate === null ? null : clamp01(p.savingsRate / GOOD_SAVINGS_RATE) },
    { key: 'discipline', weight: HEALTH_WEIGHTS.discipline, score: p.disciplineRatio === null ? null : clamp01(p.disciplineRatio) },
    { key: 'onTrack', weight: HEALTH_WEIGHTS.onTrack, score: p.onTrack.total ? p.onTrack.ok / p.onTrack.total : null },
  ];
}

export function healthScore(factors: HealthFactor[]): number | null {
  const known = factors.filter((f) => f.score !== null);
  const weight = known.reduce((s, f) => s + f.weight, 0);
  if (!weight) return null;
  return Math.round((known.reduce((s, f) => s + f.weight * f.score!, 0) / weight) * 100);
}

export type HealthLevel = 'excellent' | 'stable' | 'improve' | 'alert';

export function healthLevel(score: number): HealthLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'stable';
  if (score >= 40) return 'improve';
  return 'alert';
}
