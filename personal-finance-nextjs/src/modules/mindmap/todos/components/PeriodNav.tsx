'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, cn, formatDateVi, formatShortDateVi, toDateKey } from '@/modules/mindmap/lib/utils';

export type PeriodMode = 'day' | 'week';

/** Chọn ngày (hoặc tuần) + chuyển chế độ xem Theo ngày / Theo tuần. */
export function PeriodNav({
  mode,
  dateKey,
  weekStart,
  onModeChange,
  onDateChange,
}: {
  mode: PeriodMode;
  dateKey: string;
  weekStart: string;
  onModeChange: (mode: PeriodMode) => void;
  onDateChange: (dateKey: string) => void;
}) {
  const today = toDateKey(new Date());
  const step = mode === 'day' ? 1 : 7;
  const label =
    mode === 'day'
      ? formatDateVi(dateKey)
      : `${formatShortDateVi(weekStart)} – ${formatShortDateVi(addDays(weekStart, 6))}`;
  const isCurrent = mode === 'day' ? dateKey === today : today >= weekStart && today <= addDays(weekStart, 6);

  const arrow =
    'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#eaedff] hover:text-gray-900';

  return (
    <div className="flex items-center gap-2 self-start rounded-xl bg-white p-1 shadow-sm md:self-auto">
      <div className="flex items-center gap-1 pr-1">
        <button type="button" aria-label="Trước" onClick={() => onDateChange(addDays(dateKey, -step))} className={arrow}>
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDateChange(today)}
          title={isCurrent ? undefined : 'Về hôm nay'}
          className="flex items-center gap-1.5 rounded-lg bg-[#eaedff] px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-gray-900 shadow-sm"
        >
          <CalendarDays size={16} className="text-violet-700" />
          {label}
          {isCurrent && (
            <span className="rounded-full bg-violet-600 px-1.5 text-[10px] text-white">
              {mode === 'day' ? 'Hôm nay' : 'Tuần này'}
            </span>
          )}
        </button>
        <button type="button" aria-label="Sau" onClick={() => onDateChange(addDays(dateKey, step))} className={arrow}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="h-6 w-px bg-[#dae2fd]" />
      <div className="flex items-center rounded-lg bg-[#eaedff] p-0.5">
        {(
          [
            ['day', 'Theo ngày'],
            ['week', 'Theo tuần'],
          ] as const
        ).map(([m, text]) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition',
              mode === m ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900',
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
