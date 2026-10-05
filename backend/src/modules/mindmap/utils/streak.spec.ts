import { computeStreak } from './streak';

describe('computeStreak', () => {
  const today = '2026-10-05';

  it('đếm ngược từ hôm nay khi hôm nay đã xong việc', () => {
    expect(computeStreak(['2026-10-03', '2026-10-04', '2026-10-05'], today)).toEqual({ current: 3, best: 3, activeToday: true });
  });

  it('hôm nay chưa xong việc nào → chuỗi tính tới hôm qua, chưa đứt', () => {
    expect(computeStreak(['2026-10-02', '2026-10-03', '2026-10-04'], today)).toEqual({ current: 3, best: 3, activeToday: false });
  });

  it('bỏ một ngày → đứt chuỗi; best giữ chuỗi dài nhất; ngày trùng / không theo thứ tự vẫn đúng', () => {
    const dates = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-05', '2026-10-05', '2026-10-01'];
    expect(computeStreak(dates, today)).toEqual({ current: 1, best: 4, activeToday: true });
    expect(computeStreak(['2026-10-01'], today)).toEqual({ current: 0, best: 1, activeToday: false });
    expect(computeStreak([], today)).toEqual({ current: 0, best: 0, activeToday: false });
  });

  it('chuỗi qua ranh giới tháng', () => {
    expect(computeStreak(['2026-09-29', '2026-09-30', '2026-10-01'], '2026-10-01').current).toBe(3);
  });
});
