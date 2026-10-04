import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

/** Local-timezone YYYY-MM-DD (never toISOString — that shifts the day in UTC+7). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return toDateKey(date);
}

/** Thứ hai của tuần chứa dateKey. */
export function startOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const offset = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(dateKey, -offset);
}

export function formatShortDateVi(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${d}/${m}`;
}

export function formatDateVi(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = [
    'Chủ nhật',
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
  ];
  return `${weekdays[date.getDay()]}, ${d}/${m}/${y}`;
}

/** 95 → "1 giờ 35 phút", 40 → "40 phút". */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} giờ ${rest} phút` : `${h} giờ`;
}

/** 3.7 → "★3,7" */
export function formatRating(n: number): string {
  return `★${n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}`;
}
