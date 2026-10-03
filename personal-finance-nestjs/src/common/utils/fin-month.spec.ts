import { currentMonthVN, monthOfDate, monthRange } from './dates.util';
import { previousPeriod, resolvePeriod } from './period.util';

// Tháng tài chính: ngày bắt đầu tháng = ngày nhận lương (VD 5)
describe('tháng tài chính (startDay)', () => {
  it('monthRange: startDay 1 là tháng lịch, startDay 5 chạy từ 05 tới 04 tháng sau', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2026-10', 5)).toEqual({ from: '2026-10-05', to: '2026-11-04' });
    expect(monthRange('2026-12', 5)).toEqual({ from: '2026-12-05', to: '2027-01-04' });
    // Tháng 2 ngắn: 28/01 → 27/02
    expect(monthRange('2026-01', 28)).toEqual({ from: '2026-01-28', to: '2026-02-27' });
  });

  it('monthOfDate: trước ngày bắt đầu thì thuộc tháng trước', () => {
    expect(monthOfDate('2026-10-02', 5)).toBe('2026-09');
    expect(monthOfDate('2026-10-05', 5)).toBe('2026-10');
    expect(monthOfDate('2026-11-04', 5)).toBe('2026-10');
    expect(monthOfDate('2026-01-03', 5)).toBe('2025-12');
    expect(monthOfDate('2026-10-02')).toBe('2026-10');
  });

  it('currentMonthVN đổi theo startDay', () => {
    // Không kiểm tra giá trị tuyệt đối (phụ thuộc ngày chạy), chỉ cần hợp lệ và nhất quán với monthOfDate
    expect(currentMonthVN(5)).toMatch(/^\d{4}-\d{2}$/);
  });

  it('resolvePeriod: "tháng trước" trọn kỳ lương', () => {
    const lastMonth = resolvePeriod('last_month', undefined, 5);
    expect(lastMonth.from.endsWith('-05')).toBe(true);
    expect(lastMonth.to.endsWith('-04')).toBe(true);
    const thisMonth = resolvePeriod('this_month', undefined, 5);
    expect(thisMonth.from.endsWith('-05')).toBe(true);
  });

  it('previousPeriod: kỳ bắt đầu đúng ngày lương thì lùi đúng một tháng lương', () => {
    expect(previousPeriod({ from: '2026-10-05', to: '2026-11-04' }, 5)).toEqual({ from: '2026-09-05', to: '2026-10-04' });
    // Kỳ dở dang (05/10 → 15/10) → 05/09 → 15/09
    expect(previousPeriod({ from: '2026-10-05', to: '2026-10-15' }, 5)).toEqual({ from: '2026-09-05', to: '2026-09-15' });
    // Kỳ tùy chọn không bắt đầu từ ngày lương → lùi theo số ngày
    expect(previousPeriod({ from: '2026-10-10', to: '2026-10-12' }, 5)).toEqual({ from: '2026-10-07', to: '2026-10-09' });
    // startDay 1 giữ hành vi cũ
    expect(previousPeriod({ from: '2026-10-01', to: '2026-10-31' })).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });
});
