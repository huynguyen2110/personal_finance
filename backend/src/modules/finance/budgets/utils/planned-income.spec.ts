import { incomeMonthsIn, plannedSavingsFor } from './planned-income';

const at = (date: string) => new Date(`${date}T10:00:00+07:00`);

describe('planned-income', () => {
  it('plannedSavingsFor: chỉ tính mục tiêu còn chạy trong tháng', () => {
    const goals = [
      { monthlyPlan: 1_000_000n, createdAt: at('2026-08-10'), archivedAt: null, completedAt: null },
      { monthlyPlan: 500_000n, createdAt: at('2026-10-20'), archivedAt: null, completedAt: null }, // tạo sau tháng 9
      { monthlyPlan: 300_000n, createdAt: at('2026-01-01'), archivedAt: at('2026-08-15'), completedAt: null }, // lưu trữ từ tháng 8
      { monthlyPlan: 200_000n, createdAt: at('2026-01-01'), archivedAt: null, completedAt: at('2026-09-12') }, // hoàn thành trong tháng 9
      { monthlyPlan: null, createdAt: at('2026-01-01'), archivedAt: null, completedAt: null },
    ];
    expect(plannedSavingsFor(goals, '2026-09', 1)).toBe(1_200_000);
    expect(plannedSavingsFor(goals, '2026-10', 1)).toBe(1_500_000);
    expect(plannedSavingsFor(goals, '2026-08', 1)).toBe(1_500_000);
  });

  it('plannedSavingsFor: theo tháng tài chính (ngày bắt đầu tháng 5)', () => {
    const goals = [{ monthlyPlan: 1_000_000n, createdAt: at('2026-10-03'), archivedAt: null, completedAt: null }];
    // 03/10 thuộc tháng tài chính 2026-09 (05/09 → 04/10)
    expect(plannedSavingsFor(goals, '2026-09', 5)).toBe(1_000_000);
  });

  it('incomeMonthsIn: tháng nào có ngày đầu tháng nằm trong kỳ', () => {
    expect(incomeMonthsIn('2026-10-05', '2026-10-05', 5)).toEqual(['2026-10']); // tháng này tính tới hôm nay = ngày lương
    expect(incomeMonthsIn('2026-10-06', '2026-10-20', 5)).toEqual([]); // kỳ giữa tháng: không có ngày lương
    expect(incomeMonthsIn('2026-08-05', '2026-10-10', 5)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(incomeMonthsIn('2026-01-01', '2026-03-31', 1)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});
