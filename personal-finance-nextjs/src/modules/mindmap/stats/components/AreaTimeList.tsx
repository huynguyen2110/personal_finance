'use client';

import Link from 'next/link';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { formatMinutes, formatRating } from '@/modules/mindmap/lib/utils';
import { AreaStat } from '../api';

/** Thời gian đầu tư theo lĩnh vực: thanh tuần này + vạch tuần trước để so sánh. */
export function AreaTimeList({ areas }: { areas: AreaStat[] }) {
  const max = Math.max(1, ...areas.flatMap((a) => [a.minutes, a.prevMinutes]));
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Theo lĩnh vực
        </h3>
        <span className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-violet-500" /> Tuần này
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-0.5 bg-gray-400" /> Tuần trước
          </span>
        </span>
      </div>
      {areas.length === 0 ? (
        <p className="text-sm text-gray-400">
          Chưa có todo nào gắn với lĩnh vực (nhánh cấp 1 hoặc bên dưới) trong
          tuần này và tuần trước.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {areas.map((a) => {
            const delta = a.minutes - a.prevMinutes;
            return (
              <li key={a.areaId}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Link
                    href={growthRoutes.node(a.areaId)}
                    className="truncate text-sm font-medium text-gray-700 hover:text-violet-700"
                  >
                    {a.title}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500">
                    {a.minutes > 0 ? formatMinutes(a.minutes) : '0 phút'}
                    {delta !== 0 && (
                      <span
                        className={
                          delta > 0 ? 'ml-1 text-green-600' : 'ml-1 text-red-500'
                        }
                      >
                        ({delta > 0 ? '+' : '−'}
                        {formatMinutes(Math.abs(delta))})
                      </span>
                    )}
                    {' · '}
                    {a.done}/{a.total} todo
                    {a.avgEffectiveness !== null &&
                      ` · ${formatRating(a.avgEffectiveness)}`}
                  </span>
                </div>
                <div
                  className="relative h-2 rounded-full bg-gray-100"
                  title={`Tuần này ${a.minutes} phút, tuần trước ${a.prevMinutes} phút`}
                >
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${(a.minutes / max) * 100}%` }}
                  />
                  {a.prevMinutes > 0 && (
                    <div
                      className="absolute -top-0.5 h-3 w-0.5 rounded bg-gray-400"
                      style={{ left: `calc(${(a.prevMinutes / max) * 100}% - 1px)` }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
