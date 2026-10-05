import { monthOfDateVN, monthOfDate, monthRange, monthsBetween } from '../../../../common/utils/dates.util';

// Phép tính thuần cho "thu nhập kế hoạch" (chế độ chỉ lấy email tiền đi) — có test riêng.
// Thu nhập của một tháng tài chính = tổng hạn mức ngân sách + tiền tiết kiệm đã ghi nạp trong tháng.
// Thu nhập ≠ ngân sách: phần đem đi tiết kiệm cũng là thu nhập của tháng đó.
// Ghi nhận vào NGÀY ĐẦU của tháng tài chính (như ngày lương): kỳ nào chứa ngày đó thì có trọn thu nhập của tháng.

export interface SavingsContribution {
  kind: string; // OPENING | DEPOSIT | WITHDRAW | INTEREST | SPEND
  amount: bigint | number;
  date: Date;
}

// Tiền tiết kiệm của tháng = tổng nạp − rút ở mọi quỹ trong tháng (tối thiểu 0).
// Không tính số dư ban đầu (tiền có sẵn từ trước), tiền lãi (không phải từ thu nhập) và khoản tiêu từ quỹ.
export function depositedSavingsFor(contributions: SavingsContribution[], month: string, startDay: number): number {
  const net = contributions.reduce((s, c) => {
    if (c.kind !== 'DEPOSIT' && c.kind !== 'WITHDRAW') return s;
    if (monthOfDateVN(c.date, startDay) !== month) return s;
    return s + (c.kind === 'DEPOSIT' ? 1 : -1) * Number(c.amount);
  }, 0);
  return Math.max(0, net);
}

// Các tháng tài chính có ngày đầu tháng nằm trong [from, to]
export function incomeMonthsIn(from: string, to: string, startDay: number): string[] {
  return monthsBetween(monthOfDate(from, startDay), monthOfDate(to, startDay)).filter((m) => {
    const start = monthRange(m, startDay).from;
    return start >= from && start <= to;
  });
}
