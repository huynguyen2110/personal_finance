import { addMonths, monthRange, startOfVNDay, toVNDateString, weekdayOf } from './dates.util';
import { previousPeriod } from './period.util';

describe('dates.util (giờ Việt Nam)', () => {
  it('đầu ngày VN = 17:00 UTC hôm trước', () => {
    expect(startOfVNDay('2026-09-29').toISOString()).toBe('2026-09-28T17:00:00.000Z');
    expect(toVNDateString(new Date('2026-09-28T17:30:00Z'))).toBe('2026-09-29');
  });

  it('tháng, thứ trong tuần', () => {
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(weekdayOf('2026-09-29')).toBe(2); // Thứ 3
  });
});

describe('period.util', () => {
  it('kỳ trước của kỳ tính từ ngày 1 lùi đúng số tháng', () => {
    expect(previousPeriod({ from: '2026-09-01', to: '2026-09-29' })).toEqual({ from: '2026-08-01', to: '2026-08-29' });
    expect(previousPeriod({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('kỳ tùy chọn lùi bằng số ngày', () => {
    expect(previousPeriod({ from: '2026-09-10', to: '2026-09-19' })).toEqual({ from: '2026-08-31', to: '2026-09-09' });
  });
});
