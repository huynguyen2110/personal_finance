import {
  addDaysStr,
  addMonths,
  daysBetween,
  monthRange,
  todayVN,
} from './dates';

export type PeriodPreset =
  | 'this_month'
  | 'last_month'
  | 'last_3m'
  | 'last_6m'
  | 'last_12m'
  | 'this_year'
  | 'custom';

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'last_3m', label: '3 tháng gần đây' },
  { value: 'last_6m', label: '6 tháng gần đây' },
  { value: 'last_12m', label: '12 tháng gần đây' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn…' },
];

export interface Period {
  from: string;
  to: string;
}

export function resolvePeriod(preset: PeriodPreset, custom?: Period): Period {
  const today = todayVN();
  const month = today.slice(0, 7);
  switch (preset) {
    case 'this_month':
      return { from: `${month}-01`, to: today };
    case 'last_month':
      return monthRange(addMonths(month, -1));
    case 'last_3m':
      return { from: `${addMonths(month, -2)}-01`, to: today };
    case 'last_6m':
      return { from: `${addMonths(month, -5)}-01`, to: today };
    case 'last_12m':
      return { from: `${addMonths(month, -11)}-01`, to: today };
    case 'this_year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'custom':
      return custom ?? { from: `${month}-01`, to: today };
  }
}

// Dời một ngày "YYYY-MM-DD" đi n tháng, giữ ngày trong tháng (kẹp theo độ dài tháng đích)
function shiftDateByMonths(date: string, n: number): string {
  const m = addMonths(date.slice(0, 7), n);
  const last = Number(monthRange(m).to.slice(8, 10));
  const d = Math.min(Number(date.slice(8, 10)), last);
  return `${m}-${String(d).padStart(2, '0')}`;
}

// Kỳ liền trước để so sánh:
// - kỳ bắt đầu từ ngày 1 → lùi đúng số tháng (VD: 1–15/9 so với 1–15/8)
// - kỳ tùy chọn khác → lùi bằng số ngày
export function previousPeriod(p: Period): Period {
  if (p.from.endsWith('-01')) {
    const months =
      (Number(p.to.slice(0, 4)) - Number(p.from.slice(0, 4))) * 12 +
      Number(p.to.slice(5, 7)) -
      Number(p.from.slice(5, 7)) +
      1;
    const isFullLastMonth = monthRange(p.to.slice(0, 7)).to === p.to;
    return {
      from: shiftDateByMonths(p.from, -months),
      to: isFullLastMonth ? monthRange(addMonths(p.to.slice(0, 7), -months)).to : shiftDateByMonths(p.to, -months),
    };
  }
  const len = daysBetween(p.from, p.to);
  return { from: addDaysStr(p.from, -len), to: addDaysStr(p.from, -1) };
}
