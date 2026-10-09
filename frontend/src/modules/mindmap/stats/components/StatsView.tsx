'use client';

import { CalendarDays, ChevronLeft, ChevronRight, Share } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMindmapTree } from '@/modules/mindmap/canvas/useMindmapTree';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { cn, toDateKey } from '@/modules/mindmap/lib/utils';
import { useNodes } from '@/modules/mindmap/mindmaps/hooks';
import { usePlan } from '@/modules/mindmap/plan/hooks';
import { useStreak } from '@/modules/mindmap/todos/hooks';
import { RangeStats } from '../api';
import { useRangeStats } from '../hooks';
import { bucketsOf, elapsedDays, PERIOD_LABELS, PeriodMode, periodOf, shiftAnchor } from '../period';
import { AreaBreakdown } from './AreaBreakdown';
import { CompletionChart } from './CompletionChart';
import { KpiCards } from './KpiCards';
import { LeverageCards } from './LeverageCards';
import { MomentumCard } from './MomentumCard';

/** Xuất báo cáo kỳ đang xem ra CSV (mở được bằng Excel). */
function exportCsv(data: RangeStats, label: string) {
  const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    [q('Báo cáo phát triển bản thân'), q(label), q(`${data.from} → ${data.to}`)].join(','),
    '',
    ['Ngày', 'Tổng todo', 'Đã xong', 'Phút'].map(q).join(','),
    ...data.days.map((d) => [d.date, d.total, d.done, d.minutes].map(q).join(',')),
    ['Tổng', data.totals.total, data.totals.done, data.totals.minutes].map(q).join(','),
    ['Kỳ trước', data.prevTotals.total, data.prevTotals.done, data.prevTotals.minutes].map(q).join(','),
    '',
    ['Lĩnh vực', 'Tổng todo', 'Đã xong', 'Phút', 'Phút kỳ trước', 'Hiệu quả TB'].map(q).join(','),
    ...data.byArea.map((a) =>
      [a.title, a.total, a.done, a.minutes, a.prevMinutes, a.avgEffectiveness].map(q).join(','),
    ),
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `bao-cao-phat-trien_${data.from}_${data.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function StatsView({ mindmapId }: { mindmapId: number }) {
  const [mode, setMode] = useState<PeriodMode>('week');
  const [anchor, setAnchor] = useState(() => toDateKey(new Date()));
  const period = useMemo(() => periodOf(mode, anchor), [mode, anchor]);
  const { data, isLoading, dataUpdatedAt } = useRangeStats(period.from, period.to);
  const { data: plan } = usePlan(mindmapId);
  const { data: nodes } = useNodes(mindmapId);
  const tree = useMindmapTree(nodes);
  const { data: streak } = useStreak();
  const colorOf = (id: number) => tree.colorOf.get(id) ?? '#7c3aed';

  const buckets = useMemo(() => (data ? bucketsOf(mode, data.days) : []), [data, mode]);
  const elapsed = elapsedDays(period);
  // Mắt xích mở khóa đáng đầu tư nhất: việc chưa xong có mở khóa, nhiều phút gần đây nhất rồi điểm cao nhất
  const unlock = useMemo(
    () =>
      (plan?.actions ?? [])
        .filter((a) => a.unlocks.length > 0 && a.status !== 'done')
        .sort((a, b) => b.todos.minutes - a.todos.minutes || b.score - a.score)[0] ?? null,
    [plan],
  );
  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const arrow =
    'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#eaedff] hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="page-in flex w-full flex-col gap-6 p-6 pb-10 md:p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-violet-700 uppercase">
              Phân tích đa chiều
            </span>
            {updatedAt && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                <span className="text-[11px] font-semibold text-gray-500">Dữ liệu cập nhật lúc {updatedAt}</span>
              </>
            )}
          </div>
          <h1 className="text-[28px] leading-9 font-bold tracking-tight text-gray-900">
            Báo cáo hiệu suất &amp; tác động phát triển
          </h1>
          <p className="text-sm text-gray-500">
            Lượng hóa thời gian đầu tư, hiệu ứng mở khóa và chỉ số duy trì kỷ luật.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
            <button
              type="button"
              aria-label="Kỳ trước"
              onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))}
              className={arrow}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(toDateKey(new Date()))}
              title={period.isCurrent ? undefined : 'Về kỳ hiện tại'}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold whitespace-nowrap text-gray-900"
            >
              <CalendarDays size={17} className="text-violet-700" />
              {period.label}
              {period.isCurrent && (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] text-white">
                  {mode === 'week' ? 'Tuần này' : mode === 'month' ? 'Tháng này' : 'Quý này'}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Kỳ sau"
              disabled={period.isCurrent || period.isFuture}
              onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))}
              className={arrow}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center rounded-xl bg-white p-1 shadow-sm">
            {(Object.keys(PERIOD_LABELS) as PeriodMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                  mode === m ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900',
                )}
              >
                {PERIOD_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && exportCsv(data, period.label)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-[#eaedff] disabled:opacity-50"
          >
            <Share size={17} /> Xuất báo cáo
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <KpiCards data={data} elapsed={elapsed} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <CompletionChart buckets={buckets} period={period} />
            <AreaBreakdown areas={data.byArea} planAreas={plan?.areas ?? []} colorOf={colorOf} />
          </div>

          <LeverageCards synergy={data.synergy[0] ?? null} unlock={unlock} colorOf={colorOf} />

          <MomentumCard data={data} plan={plan} elapsed={elapsed} streak={streak?.current ?? 0} />
        </>
      )}
    </div>
  );
}
