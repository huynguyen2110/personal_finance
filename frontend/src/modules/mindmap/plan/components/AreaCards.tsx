'use client';

import { AlertTriangle } from 'lucide-react';
import { formatCompactVND } from '@/lib/money';
import { cn, formatMinutesShort, formatRating } from '@/modules/mindmap/lib/utils';
import { PlanArea } from '../api';

/**
 * Mỗi lĩnh vực (nhánh cấp 1): ưu tiên, tiến độ hành động, phần việc còn lại, thời gian đã đầu tư.
 * Bấm thẻ để lọc danh sách "Nên làm tiếp" theo lĩnh vực đó.
 */
export function AreaCards({
  areas,
  windowDays,
  colorOf,
  selectedId,
  onSelect,
}: {
  areas: PlanArea[];
  windowDays: number;
  colorOf: (areaId: number) => string;
  selectedId: number | null;
  onSelect: (areaId: number | null) => void;
}) {
  if (areas.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
        Chưa có lĩnh vực nào. Mở <b>Sơ đồ</b>, chọn nút gốc rồi bấm Tab để thêm một nhánh cho mỗi thứ bạn
        muốn phát triển (VD: Tiếng Anh, Sức khỏe), sau đó thêm hành động bên dưới.
      </p>
    );
  }
  return (
    <section
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[repeat(var(--areas),minmax(0,1fr))]"
      style={{ '--areas': Math.min(areas.length, 6) } as React.CSSProperties}
    >
      {areas.map((area) => {
        const percent = area.actionsTotal > 0 ? Math.round((area.actionsDone / area.actionsTotal) * 100) : 0;
        const color = colorOf(area.nodeId);
        const selected = selectedId === area.nodeId;
        return (
          <button
            key={area.nodeId}
            type="button"
            onClick={() => onSelect(selected ? null : area.nodeId)}
            title={selected ? 'Bỏ lọc lĩnh vực' : 'Lọc "Nên làm tiếp" theo lĩnh vực này'}
            className={cn(
              'group flex flex-col justify-between gap-2.5 rounded-xl bg-white p-3 text-left shadow-sm transition-all hover:shadow-md',
              selected && 'ring-2 ring-violet-400',
            )}
          >
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-violet-700">
                    {area.title}
                  </h3>
                </span>
                {area.priority && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: `${area.priority.color}1f`, color: area.priority.color }}
                  >
                    {area.priority.label}
                  </span>
                )}
              </div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                <span>Hành động xong</span>
                <span className="text-gray-900 tabular-nums">
                  {area.actionsDone} / {area.actionsTotal}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eaedff]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(percent, area.actionsTotal ? 4 : 0)}%`, backgroundColor: color }}
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f2f3ff] p-2 text-center">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-gray-500">Còn lại</span>
                  <span className="text-[13px] font-semibold text-gray-900">
                    {area.remainingHours > 0 ? `${area.remainingHours} giờ` : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-gray-500">Chi phí</span>
                  <span className="text-[13px] font-semibold text-gray-900">
                    {area.remainingCost > 0 ? `${formatCompactVND(area.remainingCost)}₫` : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-gray-500">{windowDays} ngày</span>
                  <span className="flex items-center justify-center gap-1 text-[13px] font-semibold whitespace-nowrap text-gray-900">
                    {area.todos.minutes > 0 ? formatMinutesShort(area.todos.minutes) : `${area.todos.done} todo`}
                    {area.todos.avgEffectiveness !== null && (
                      <span className="text-amber-600">{formatRating(area.todos.avgEffectiveness)}</span>
                    )}
                  </span>
                </div>
              </div>
              {area.actionsTotal === 0 ? (
                <p className="rounded px-2 py-1 text-[11px] font-semibold text-gray-500">
                  Chưa có hành động — thêm bằng ô “Thêm nhanh” bên dưới
                </p>
              ) : (
                area.neglected && (
                  <p className="flex items-center gap-1.5 rounded bg-amber-100/70 px-2 py-1 text-[11px] font-semibold text-amber-900">
                    <AlertTriangle size={13} className="shrink-0 text-amber-700" />
                    <span className="truncate">Ưu tiên cao nhưng 14 ngày chưa làm</span>
                  </p>
                )
              )}
            </div>
          </button>
        );
      })}
    </section>
  );
}
