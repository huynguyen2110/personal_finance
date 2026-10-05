// Chuỗi ngày liên tục có ít nhất một todo hoàn thành — hàm thuần, có test riêng.
import { addDaysStr } from '../../../common/utils/dates.util';

export interface Streak {
  // Chuỗi hiện tại: tính tới hôm nay, hoặc tới hôm qua nếu hôm nay chưa xong việc nào (chuỗi chưa đứt)
  current: number;
  best: number;
  activeToday: boolean;
}

export function computeStreak(dates: string[], today: string): Streak {
  const days = new Set(dates);
  const activeToday = days.has(today);
  let current = 0;
  for (let d = activeToday ? today : addDaysStr(today, -1); days.has(d); d = addDaysStr(d, -1)) current++;

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...days].sort()) {
    run = prev !== null && addDaysStr(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best, activeToday };
}
