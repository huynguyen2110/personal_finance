'use client';

import { cn, toDateKey } from '@/modules/mindmap/lib/utils';
import { DayStat } from '../api';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const CHART_HEIGHT = 160;

/**
 * One column per day: a gray track for the day's total with a violet fill
 * for completed todos. Single series — numbers labeled directly, no legend.
 */
export function WeeklyBarChart({ days }: { days: DayStat[] }) {
  const today = toDateKey(new Date());
  const max = Math.max(1, ...days.map((d) => d.total));
  const scale = (value: number) => Math.round((value / max) * CHART_HEIGHT);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Hoàn thành theo ngày
      </h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = day.date === today;
          const allDone = day.total > 0 && day.done >= day.total;
          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1.5"
              title={`${DAY_LABELS[i]} ${day.date}: hoàn thành ${day.done}/${day.total} todo`}
            >
              <span className="text-[11px] font-medium tabular-nums text-gray-500">
                {day.total > 0 ? `${day.done}/${day.total}` : '–'}
              </span>
              <div
                className="relative flex w-full max-w-9 items-end justify-center"
                style={{ height: CHART_HEIGHT }}
              >
                {day.total > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-gray-100"
                    style={{ height: scale(day.total) }}
                  />
                )}
                {day.done > 0 && (
                  <div
                    className={cn(
                      'absolute bottom-0 w-full rounded-t transition-all duration-300',
                      allDone ? 'bg-violet-500' : 'bg-violet-400',
                    )}
                    style={{ height: scale(day.done) }}
                  />
                )}
              </div>
              <div
                className={cn(
                  'flex flex-col items-center rounded-lg px-1.5 py-0.5',
                  isToday && 'bg-violet-50',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isToday ? 'text-violet-700' : 'text-gray-600',
                  )}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="text-[10px] text-gray-400">
                  {Number(day.date.split('-')[2])}/{Number(day.date.split('-')[1])}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
