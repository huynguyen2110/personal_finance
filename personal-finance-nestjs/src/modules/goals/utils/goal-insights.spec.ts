import {
  disciplineGrade,
  disciplineMonths,
  goalHorizon,
  goalStatus,
  monthDiff,
  monthsLeftUntil,
  projectMonth,
  simulateGoal,
} from './goal-insights';

describe('goal-insights', () => {
  it('monthDiff / monthsLeftUntil', () => {
    expect(monthDiff('2026-10', '2027-03')).toBe(5);
    expect(monthDiff('2026-10', '2026-09')).toBe(-1);
    expect(monthsLeftUntil('2026-10', '2026-12')).toBe(3);
    expect(monthsLeftUntil('2026-10', '2026-10')).toBe(1);
  });

  it('simulateGoal không lãi: chia đều', () => {
    expect(simulateGoal(65_000_000, 100_000_000, 5_000_000, null)).toEqual({ months: 7, interest: 0 });
    expect(simulateGoal(100, 100, 0, null)).toEqual({ months: 0, interest: 0 });
  });

  it('simulateGoal có lãi: về đích sớm hơn và cộng tiền lãi', () => {
    const noInterest = simulateGoal(0, 12_000_000, 1_000_000, null);
    const withInterest = simulateGoal(0, 12_000_000, 1_000_000, 6);
    expect(noInterest.months).toBe(12);
    expect(withInterest.months).toBe(12); // lãi nhỏ chưa đủ rút ngắn một tháng
    expect(withInterest.interest).toBeGreaterThan(250_000);
    expect(withInterest.interest).toBeLessThan(350_000);
  });

  it('simulateGoal: chỉ có lãi vẫn đạt được; không nạp không lãi thì null', () => {
    expect(simulateGoal(90_000_000, 100_000_000, 0, 12).months).toBe(11);
    expect(simulateGoal(10, 100, 0, null).months).toBeNull();
    expect(simulateGoal(0, 100, 0, 5).months).toBeNull();
  });

  it('goalStatus', () => {
    const base = { saved: 50, target: 100, currentMonth: '2026-10', monthlyRate: 10 };
    expect(goalStatus({ ...base, saved: 100, deadline: null, projectedMonth: null })).toBe('done');
    expect(goalStatus({ ...base, deadline: '2026-09', projectedMonth: '2026-12' })).toBe('overdue');
    expect(goalStatus({ ...base, deadline: '2026-12', projectedMonth: '2026-12' })).toBe('on_track');
    expect(goalStatus({ ...base, deadline: '2026-12', projectedMonth: '2027-01' })).toBe('behind');
    expect(goalStatus({ ...base, deadline: '2026-12', projectedMonth: null })).toBe('behind');
    expect(goalStatus({ ...base, deadline: null, projectedMonth: '2027-01' })).toBe('no_deadline');
    expect(goalStatus({ ...base, monthlyRate: 0, deadline: null, projectedMonth: null })).toBe('no_plan');
  });

  it('goalHorizon / projectMonth', () => {
    expect(goalHorizon('2026-10', '2027-10', null)).toBe('short');
    expect(goalHorizon('2026-10', '2027-11', null)).toBe('long');
    expect(goalHorizon('2026-10', null, 18)).toBe('long');
    expect(goalHorizon('2026-10', null, null)).toBeNull();
    expect(projectMonth('2026-10', 5)).toBe('2027-03');
    expect(projectMonth('2026-10', null)).toBeNull();
  });

  it('disciplineGrade / disciplineMonths', () => {
    expect(disciplineGrade(1.2)).toBe('A+');
    expect(disciplineGrade(0.9)).toBe('A');
    expect(disciplineGrade(0.4)).toBe('D');
    // tạo tháng 7, đang tháng 10 và đã qua ngày nạp → T10, T9, T8
    expect(disciplineMonths('2026-07', '2026-10', true)).toEqual(['2026-10', '2026-09', '2026-08']);
    // chưa qua ngày nạp → bỏ T10
    expect(disciplineMonths('2026-07', '2026-10', false)).toEqual(['2026-09', '2026-08']);
    // vừa tạo tháng này → chưa chấm
    expect(disciplineMonths('2026-10', '2026-10', true)).toEqual([]);
  });
});
