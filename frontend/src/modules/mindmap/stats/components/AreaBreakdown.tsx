'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { formatMinutesShort, formatRating } from '@/modules/mindmap/lib/utils';
import { PlanArea } from '@/modules/mindmap/plan/api';
import { AreaStat } from '../api';

/** Thời gian theo lĩnh vực trong kỳ, so với kỳ trước; lĩnh vực ưu tiên cao bị bỏ quên được cảnh báo riêng. */
export function AreaBreakdown({
  areas,
  planAreas,
  colorOf,
}: {
  areas: AreaStat[];
  planAreas: PlanArea[];
  colorOf: (areaId: number) => string;
}) {
  const max = Math.max(1, ...areas.flatMap((a) => [a.minutes, a.prevMinutes]));
  const active = new Set(areas.filter((a) => a.minutes > 0 || a.total > 0).map((a) => a.areaId));
  const neglected = planAreas.filter((p) => p.neglected && !active.has(p.nodeId));

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm lg:col-span-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">Phân bổ theo lĩnh vực</span>
            <span className="text-[13px] text-gray-500">Thời gian kỳ này so với kỳ trước</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="h-2 w-2 rounded-full bg-violet-700" /> Kỳ này
            <span className="ml-1 h-3 w-0.5 bg-gray-400" /> Kỳ trước
          </div>
        </div>

        {areas.length === 0 && neglected.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-gray-400">
            Chưa có todo nào gắn với lĩnh vực trong kỳ này và kỳ trước.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            {areas.map((a) => {
              const Icon = areaIcon(a.title);
              const color = colorOf(a.areaId);
              const delta = a.minutes - a.prevMinutes;
              return (
                <div key={a.areaId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-gray-900">
                      <Icon size={17} style={{ color }} className="shrink-0" />
                      <span className="truncate">{a.title}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {a.minutes > 0 ? formatMinutesShort(a.minutes) : '0 phút'}
                      </span>
                      {delta !== 0 && (
                        <span className={delta > 0 ? 'text-[11px] font-medium text-teal-700' : 'text-[11px] font-medium text-red-600'}>
                          ({delta > 0 ? '+' : '−'}
                          {formatMinutesShort(Math.abs(delta))})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full rounded-full bg-[#eaedff]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(a.minutes / max) * 100}%`, backgroundColor: color }}
                    />
                    {a.prevMinutes > 0 && (
                      <div
                        className="absolute -top-0.5 h-3.5 w-0.5 rounded bg-gray-400"
                        style={{ left: `calc(${(a.prevMinutes / max) * 100}% - 1px)` }}
                        title={`Kỳ trước: ${a.prevMinutes} phút`}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-0.5 text-[11px] font-semibold text-gray-500">
                    <span>
                      {a.done}/{a.total} todo hoàn thành
                      {a.total > 0 && a.done === 0 && ' • Cần đẩy nhanh'}
                    </span>
                    {a.avgEffectiveness !== null && (
                      <span className="text-amber-700">{formatRating(a.avgEffectiveness)} hiệu quả</span>
                    )}
                  </div>
                </div>
              );
            })}

            {neglected.map((p) => (
              <div key={p.nodeId} className="flex flex-col gap-1 rounded-xl bg-red-50 p-2">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-1.5 font-semibold text-red-700">
                    <AlertTriangle size={17} /> {p.title}
                  </span>
                  <span className="text-[11px] font-semibold text-red-700">0 giờ đầu tư</span>
                </div>
                <div className="h-2 w-full rounded-full bg-red-100" />
                <span className="mt-0.5 text-[11px] font-semibold text-red-700">
                  Ưu tiên cao nhưng 14 ngày nay chưa ghi nhận hoạt động!
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={growthRoutes.plan}
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-[#eaedff] px-3 py-2 text-xs font-semibold text-gray-900 transition hover:bg-[#e2e7ff]"
      >
        Xem kế hoạch {planAreas.length} lĩnh vực <ArrowRight size={15} />
      </Link>
    </div>
  );
}
