// Toàn bộ ứng dụng dùng giờ Việt Nam (UTC+7, không có DST).
export const VN_TZ = 'Asia/Ho_Chi_Minh';
export const VN_OFFSET = '+07:00';

const pad = (n: number) => String(n).padStart(2, '0');

// Lấy các thành phần ngày theo giờ VN
export function vnParts(d: Date) {
  const shifted = new Date(d.getTime() + 7 * 3600 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

// Date → "YYYY-MM-DD" theo giờ VN
export function toVNDateString(d: Date): string {
  const p = vnParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

// Date → "YYYY-MM" theo giờ VN
export function toVNMonthString(d: Date): string {
  const p = vnParts(d);
  return `${p.year}-${pad(p.month)}`;
}

// "YYYY-MM-DD" (VN) → Date đầu ngày
export function startOfVNDay(date: string): Date {
  return new Date(`${date}T00:00:00${VN_OFFSET}`);
}

// "YYYY-MM-DD" (VN) → Date đầu ngày HÔM SAU (dùng làm cận trên loại trừ)
export function endOfVNDayExclusive(date: string): Date {
  return new Date(startOfVNDay(date).getTime() + 24 * 3600 * 1000);
}

export function addDaysStr(date: string, days: number): string {
  return toVNDateString(new Date(startOfVNDay(date).getTime() + days * 24 * 3600 * 1000));
}

// Thứ trong tuần của một ngày lịch "YYYY-MM-DD" (0 = Chủ nhật)
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  return Math.round((startOfVNDay(to).getTime() - startOfVNDay(from).getTime()) / 86400000) + 1;
}

// "YYYY-MM" → { from: "YYYY-MM-01", to: "YYYY-MM-<last>" }
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

// Danh sách tháng "YYYY-MM" từ from → to (bao gồm)
export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const out: string[] = [];
  let cur = fromMonth;
  while (cur <= toMonth && out.length < 240) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

export function todayVN(): string {
  return toVNDateString(new Date());
}

export function currentMonthVN(): string {
  return toVNMonthString(new Date());
}

export function isValidDateStr(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(startOfVNDay(s).getTime());
}

export function isValidMonthStr(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

// Hiển thị: "02/07/2024 11:08"
export function formatVNDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const p = vnParts(date);
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`;
}

// Hiển thị: "02/07/2024"
export function formatVNDate(d: Date | string): string {
  const date = typeof d === 'string' ? (d.length === 10 ? startOfVNDay(d) : new Date(d)) : d;
  const p = vnParts(date);
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

// "2024-07" → "T7/2024"
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `T${Number(m)}/${y}`;
}
