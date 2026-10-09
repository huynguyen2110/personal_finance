import { addDays, formatShortDateVi, startOfWeek, toDateKey } from '@/modules/mindmap/lib/utils';
import { DayStat } from './api';

export type PeriodMode = 'week' | 'month' | 'quarter';

export const PERIOD_LABELS: Record<PeriodMode, string> = {
  week: 'Tuần',
  month: 'Tháng',
  quarter: 'Quý',
};

export interface Period {
  mode: PeriodMode;
  from: string;
  to: string;
  /** VD "5/10 – 11/10", "Tháng 10/2026", "Quý 4/2026" */
  label: string;
  /** Kỳ chứa hôm nay. */
  isCurrent: boolean;
  /** Đang xem kỳ sau hôm nay (không cho đi tiếp). */
  isFuture: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

export function periodOf(mode: PeriodMode, anchor: string): Period {
  const today = toDateKey(new Date());
  const [y, m] = anchor.split('-').map(Number);
  let from: string;
  let to: string;
  let label: string;
  if (mode === 'week') {
    from = startOfWeek(anchor);
    to = addDays(from, 6);
    label = `${formatShortDateVi(from)} – ${formatShortDateVi(to)}`;
  } else if (mode === 'month') {
    from = dateKey(y, m, 1);
    to = dateKey(y, m, lastDay(y, m));
    label = `Tháng ${m}/${y}`;
  } else {
    const q = Math.floor((m - 1) / 3);
    from = dateKey(y, q * 3 + 1, 1);
    to = dateKey(y, q * 3 + 3, lastDay(y, q * 3 + 3));
    label = `Quý ${q + 1}/${y}`;
  }
  return { mode, from, to, label, isCurrent: today >= from && today <= to, isFuture: from > today };
}

/** Lùi / tới một kỳ (trả về ngày neo mới). */
export function shiftAnchor(mode: PeriodMode, anchor: string, dir: -1 | 1): string {
  if (mode === 'week') return addDays(anchor, 7 * dir);
  const [y, m] = anchor.split('-').map(Number);
  const months = mode === 'month' ? 1 : 3;
  const d = new Date(y, m - 1 + months * dir, 1);
  return dateKey(d.getFullYear(), d.getMonth() + 1, 1);
}

/** Số tuần ISO của một ngày. */
export function isoWeek(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export interface Bucket {
  key: string;
  label: string;
  sub: string;
  total: number;
  done: number;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Cột biểu đồ: tuần / tháng theo ngày, quý theo tuần. */
export function bucketsOf(mode: PeriodMode, days: DayStat[]): Bucket[] {
  const today = toDateKey(new Date());
  if (mode !== 'quarter') {
    return days.map((d) => {
      const [y, m, day] = d.date.split('-').map(Number);
      const weekday = WEEKDAYS[new Date(y, m - 1, day).getDay()];
      return {
        key: d.date,
        label: mode === 'week' ? weekday : String(day),
        sub: mode === 'week' ? formatShortDateVi(d.date) : weekday,
        total: d.total,
        done: d.done,
        minutes: d.minutes,
        isToday: d.date === today,
        isFuture: d.date > today,
      };
    });
  }
  const weeks = new Map<string, Bucket>();
  for (const d of days) {
    const start = startOfWeek(d.date);
    const b = weeks.get(start) ?? {
      key: start,
      label: `T${isoWeek(start)}`,
      sub: formatShortDateVi(start),
      total: 0,
      done: 0,
      minutes: 0,
      isToday: false,
      isFuture: start > today,
    };
    b.total += d.total;
    b.done += d.done;
    b.minutes += d.minutes;
    if (d.date === today) b.isToday = true;
    weeks.set(start, b);
  }
  return [...weeks.values()];
}

/** Số ngày đã qua của kỳ (tính tới hôm nay) — để tính trung bình phút/ngày. */
export function elapsedDays(period: Period): number {
  const today = toDateKey(new Date());
  if (period.isFuture) return 0;
  const end = today < period.to ? today : period.to;
  let n = 0;
  for (let d = period.from; d <= end; d = addDays(d, 1)) n++;
  return n;
}
