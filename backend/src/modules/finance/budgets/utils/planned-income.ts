import { monthOfDateVN, monthOfDate, monthRange, monthsBetween } from '../../../../common/utils/dates.util';

// Phép tính thuần cho "thu nhập kế hoạch" (chế độ chỉ lấy email tiền đi) — có test riêng.
// Thu nhập của một tháng tài chính = tổng hạn mức ngân sách + tổng số tiền nạp hằng tháng của các mục tiêu tiết kiệm.
// Ghi nhận vào NGÀY ĐẦU của tháng tài chính (như ngày lương): kỳ nào chứa ngày đó thì có trọn thu nhập của tháng.

export interface PlannedGoal {
  monthlyPlan: bigint | number | null;
  createdAt: Date;
  archivedAt: Date | null;
  completedAt: Date | null;
}

// Tổng kế hoạch nạp của các mục tiêu còn chạy trong tháng `month`: đã tạo trước hết tháng, chưa lưu trữ / chưa hoàn thành
// trước tháng đó (lưu trữ hay hoàn thành ngay trong tháng vẫn tính tháng đó).
export function plannedSavingsFor(goals: PlannedGoal[], month: string, startDay: number): number {
  return goals.reduce((s, g) => {
    const plan = Number(g.monthlyPlan ?? 0);
    if (plan <= 0) return s;
    if (monthOfDateVN(g.createdAt, startDay) > month) return s;
    if (g.archivedAt && monthOfDateVN(g.archivedAt, startDay) < month) return s;
    if (g.completedAt && monthOfDateVN(g.completedAt, startDay) < month) return s;
    return s + plan;
  }, 0);
}

// Các tháng tài chính có ngày đầu tháng nằm trong [from, to]
export function incomeMonthsIn(from: string, to: string, startDay: number): string[] {
  return monthsBetween(monthOfDate(from, startDay), monthOfDate(to, startDay)).filter((m) => {
    const start = monthRange(m, startDay).from;
    return start >= from && start <= to;
  });
}
