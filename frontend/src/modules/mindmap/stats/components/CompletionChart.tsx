'use client';

import { Zap } from 'lucide-react';
import { cn, formatDateVi, formatMinutesShort } from '@/modules/mindmap/lib/utils';
import { Bucket, isoWeek, Period } from '../period';

/** Cột hoàn thành theo ngày (tuần / tháng) hoặc theo tuần (quý): cao theo số việc, phần tô = đã xong. */
export function CompletionChart({ buckets, period }: { buckets: Bucket[]; period: Period }) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const dense = buckets.length > 14;
  const best = buckets.reduce<Bucket | null>((acc, b) => (b.minutes > (acc?.minutes ?? 0) ? b : acc), null);

  const unit = period.mode === 'quarter' ? 'tuần' : 'ngày';
  const bestLabel = best
    ? period.mode === 'quarter'
      ? `Tuần ${best.sub}`
      : formatDateVi(best.key).split(',')[0]
    : null;

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm lg:col-span-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">Hoàn thành theo {unit}</span>
            {period.mode === 'week' && (
              <span className="rounded-full bg-[#eaedff] px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                Tuần {isoWeek(period.from)}
              </span>
            )}
          </div>
          <span className="mt-0.5 text-[13px] text-gray-500">Số việc và thời lượng tập trung thực tế</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-600" /> Hoàn tất
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#eaedff]" /> Chưa xong
          </span>
        </div>
      </div>

      <div
        className={cn('grid h-64 items-end pt-2 pb-1', dense ? 'gap-1' : 'gap-2')}
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      >
        {buckets.map((b) => {
          const height = b.total ? 18 + (b.total / max) * 82 : 0; // % chiều cao vùng cột
          const fill = b.total ? (b.done / b.total) * 100 : 0;
          return (
            <div
              key={b.key}
              className={cn('flex h-full flex-col items-center justify-end', b.isFuture && b.total === 0 && 'opacity-50')}
              title={`${b.label} ${b.sub}: xong ${b.done}/${b.total} việc${b.minutes ? ` • ${b.minutes} phút` : ''}`}
            >
              {!dense && (
                <span
                  className={cn(
                    'mb-1 text-[11px] font-semibold tabular-nums',
                    b.done > 0 ? 'text-violet-700' : 'text-gray-400',
                  )}
                >
                  {b.total ? `${b.done}/${b.total}` : '–'}
                </span>
              )}
              <div className="flex w-full max-w-[46px] flex-1 items-end">
                {b.total > 0 ? (
                  <div
                    className="flex w-full flex-col justify-end overflow-hidden rounded-xl bg-[#eaedff] p-0.5"
                    style={{ height: `${height}%` }}
                  >
                    <div
                      className="flex min-h-1 w-full items-center justify-center rounded-lg bg-violet-600 transition-all"
                      style={{ height: `${Math.max(fill, b.done ? 12 : 0)}%` }}
                    >
                      {!dense && b.minutes > 0 && fill >= 25 && (
                        <span className="text-[10px] font-bold text-white">{formatMinutesShort(b.minutes).replace(' phút', 'p')}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-3 w-full rounded-lg bg-[#f2f3ff]" />
                )}
              </div>
              <div
                className={cn(
                  'mt-2 flex flex-col items-center rounded-lg px-1 py-0.5',
                  b.isToday && 'bg-violet-100',
                )}
              >
                <span className={cn('text-xs font-semibold', b.isToday ? 'text-violet-700' : 'text-gray-900')}>
                  {b.label}
                </span>
                {!dense && <span className="text-[10px] text-gray-500">{b.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f2f3ff] p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
          <Zap size={16} />
        </span>
        <span className="text-[13px] text-gray-900">
          {best && best.minutes > 0
            ? `${bestLabel} đạt mức tập trung tốt nhất kỳ (${formatMinutesShort(best.minutes)}, xong ${best.done}/${best.total} việc).`
            : 'Chưa ghi nhận số phút nào trong kỳ — dùng đồng hồ Focus ở trang Todo để đo thời gian tập trung.'}
        </span>
      </div>
    </div>
  );
}
