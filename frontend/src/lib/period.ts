import {
  addDaysStr,
  addMonths,
  daysBetween,
  DEFAULT_MONTH_START_DAY,
  monthOfDate,
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

// Kỳ theo tháng tài chính (startDay = ngày bắt đầu tháng, mặc định 1). "Năm nay" bắt đầu từ tháng 1 tài chính.
export function resolvePeriod(preset: PeriodPreset, custom?: Period, startDay = DEFAULT_MONTH_START_DAY): Period {
  const today = todayVN();
  const month = monthOfDate(today, startDay);
  const startOf = (m: string) => monthRange(m, startDay).from;
  switch (preset) {
    case 'this_month':
      return { from: startOf(month), to: today };
    case 'last_month':
      return monthRange(addMonths(month, -1), startDay);
    case 'last_3m':
      return { from: startOf(addMonths(month, -2)), to: today };
    case 'last_6m':
      return { from: startOf(addMonths(month, -5)), to: today };
    case 'last_12m':
      return { from: startOf(addMonths(month, -11)), to: today };
    case 'this_year':
      return { from: startOf(`${month.slice(0, 4)}-01`), to: today };
    case 'custom':
      return custom ?? { from: startOf(month), to: today };
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
// - kỳ bắt đầu đúng ngày đầu tháng (tài chính) → lùi đúng số tháng (VD: 5–15/9 so với 5–15/8)
// - kỳ tùy chọn khác → lùi bằng số ngày
export function previousPeriod(p: Period, startDay = DEFAULT_MONTH_START_DAY): Period {
  const fromMonth = monthOfDate(p.from, startDay);
  const toMonth = monthOfDate(p.to, startDay);
  if (monthRange(fromMonth, startDay).from === p.from) {
    const months =
      (Number(toMonth.slice(0, 4)) - Number(fromMonth.slice(0, 4))) * 12 + Number(toMonth.slice(5, 7)) - Number(fromMonth.slice(5, 7)) + 1;
    const isFullLastMonth = monthRange(toMonth, startDay).to === p.to;
    return {
      from: monthRange(addMonths(fromMonth, -months), startDay).from,
      to: isFullLastMonth ? monthRange(addMonths(toMonth, -months), startDay).to : shiftDateByMonths(p.to, -months),
    };
  }
  const len = daysBetween(p.from, p.to);
  return { from: addDaysStr(p.from, -len), to: addDaysStr(p.from, -1) };
}
