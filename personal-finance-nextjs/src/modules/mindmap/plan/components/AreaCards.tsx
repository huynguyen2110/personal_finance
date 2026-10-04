'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatCompactVND } from '@/lib/money';
import { formatMinutes, formatRating } from '@/modules/mindmap/lib/utils';
import { PlanArea } from '../api';
import { OptionBadge } from './parts';

/** Mỗi lĩnh vực (nhánh cấp 1): ưu tiên, tiến độ hành động, phần việc còn lại, thời gian đã đầu tư. */
export function AreaCards({
  mindmapId,
  areas,
  windowDays,
}: {
  mindmapId: number;
  areas: PlanArea[];
  windowDays: number;
}) {
  if (areas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
        Chưa có lĩnh vực nào. Trên canvas, thêm nhánh cấp 1 cho mỗi thứ bạn
        muốn phát triển (VD: Tiếng Anh, Sức khỏe), rồi thêm hành động bên dưới.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {areas.map((area) => {
        const percent =
          area.actionsTotal > 0
            ? Math.round((area.actionsDone / area.actionsTotal) * 100)
            : 0;
        return (
          <div
            key={area.nodeId}
            className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/mindmap/${mindmapId}/nodes/${area.nodeId}`}
                className="font-semibold tracking-tight hover:text-violet-700"
              >
                {area.title}
              </Link>
              <OptionBadge option={area.priority} title="Ưu tiên của lĩnh vực" />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Hành động xong</span>
                <span className="tabular-nums">
                  {area.actionsDone}/{area.actionsTotal}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-gray-400">Còn lại</dt>
                <dd className="font-medium tabular-nums">
                  {area.remainingHours > 0 ? `${area.remainingHours} giờ` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Chi phí</dt>
                <dd className="font-medium tabular-nums">
                  {area.remainingCost > 0
                    ? `${formatCompactVND(area.remainingCost)}₫`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">{windowDays} ngày qua</dt>
                <dd className="font-medium tabular-nums">
                  {area.todos.minutes > 0
                    ? formatMinutes(area.todos.minutes)
                    : `${area.todos.done} todo`}
                  {area.todos.avgEffectiveness !== null && (
                    <span className="block text-amber-500">
                      {formatRating(area.todos.avgEffectiveness)}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {area.actionsTotal === 0 ? (
              <p className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
                Chưa có hành động — thêm nhánh con cho lĩnh vực này trên sơ đồ
              </p>
            ) : area.neglected && (
              <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                <AlertTriangle size={13} className="shrink-0" />
                Ưu tiên cao nhưng 14 ngày nay chưa làm gì
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
