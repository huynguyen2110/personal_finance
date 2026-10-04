'use client';

import { useState } from 'react';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { AreaTimeList } from '@/modules/mindmap/stats/components/AreaTimeList';
import { BranchProgressList } from '@/modules/mindmap/stats/components/BranchProgressList';
import { WeekNav } from '@/modules/mindmap/stats/components/WeekNav';
import { WeeklyBarChart } from '@/modules/mindmap/stats/components/WeeklyBarChart';
import { useWeeklyStats } from '@/modules/mindmap/stats/hooks';
import {
  formatMinutes,
  startOfWeek,
  toDateKey,
} from '@/modules/mindmap/lib/utils';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

export default function StatsPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(toDateKey(new Date())),
  );
  const { data, isLoading } = useWeeklyStats(weekStart);

  const total = data?.totals.total ?? 0;
  const done = data?.totals.done ?? 0;
  const minutes = data?.totals.minutes ?? 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="page-in mx-auto max-w-3xl space-y-4 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thống kê tuần</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Tiến độ hoàn thành todo theo từng tuần
        </p>
      </div>

      <WeekNav weekStart={weekStart} onChange={setWeekStart} />

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Tổng todo" value={String(total)} />
            <StatTile label="Đã hoàn thành" value={String(done)} />
            <StatTile label="Tỷ lệ hoàn thành" value={`${percent}%`} />
            <StatTile
              label="Thời gian đầu tư"
              value={
                minutes === 0
                  ? '—'
                  : minutes < 60
                    ? formatMinutes(minutes)
                    : `${(minutes / 60).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`
              }
            />
          </div>

          <WeeklyBarChart days={data.days} />
          <AreaTimeList areas={data.byArea} />
          <BranchProgressList branches={data.byNode} />
        </>
      )}
    </div>
  );
}
