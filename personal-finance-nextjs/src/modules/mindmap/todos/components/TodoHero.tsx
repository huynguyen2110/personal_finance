'use client';

import { Flame, Zap } from 'lucide-react';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { formatMinutes, formatMinutesShort } from '@/modules/mindmap/lib/utils';
import { Streak, Todo } from '../api';
import { areaBreakdown, GrowthLookup } from '../lookup';

const R = 30;
const C = 2 * Math.PI * R;

/** Tóm tắt ngày / tuần: vòng tiến độ, lời nhắn theo tiến độ, 2 lĩnh vực đầu tư nhiều nhất + chuỗi ngày liên tục. */
export function TodoHero({
  todos,
  lookup,
  streak,
  periodLabel,
}: {
  todos: Todo[];
  lookup: GrowthLookup;
  streak: Streak | undefined;
  periodLabel: string;
}) {
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const investedMinutes = todos
    .filter((t) => t.completed)
    .reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const left = total - done;
  const areas = areaBreakdown(todos, lookup).slice(0, 2);

  const [headline, message] =
    total === 0
      ? ['Chưa có việc nào', 'Thêm một hành động nhỏ gắn với lĩnh vực bạn muốn phát triển.']
      : left === 0
        ? [
            'Hoàn thành tất cả — tuyệt vời!',
            'Mọi việc đã xong. Ghi lại số phút và mức hiệu quả để thống kê chính xác hơn.',
          ]
        : pct >= 50
          ? ['Đà tiến triển đang tăng tốc', `Hoàn thành thêm ${left} việc để giữ phong độ ${periodLabel.toLowerCase()}.`]
          : done > 0
            ? ['Đã khởi động, tiếp tục nào', `Còn ${left} việc — bắt đầu với việc có điểm đòn bẩy cao nhất.`]
            : ['Bắt đầu từ việc dễ nhất', `${left} việc đang chờ. Một phiên Focus 25 phút là đủ để lấy đà.`];

  const streakNote = !streak
    ? ''
    : !streak.activeToday
      ? 'Xong 1 việc hôm nay để giữ chuỗi'
      : streak.current >= streak.best && streak.current > 1
        ? 'Kỷ lục mới!'
        : `Kỷ lục: ${streak.best} ngày`;

  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm">
      <div className="pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="relative z-10 flex flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="flex w-full items-center gap-4 lg:w-auto">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r={R} fill="transparent" stroke="#e2e7ff" strokeWidth="6" />
              <circle
                cx="36"
                cy="36"
                r={R}
                fill="transparent"
                stroke="#630ed4"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct / 100)}
                className="transition-[stroke-dashoffset] duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-gray-900">{pct}%</span>
              <span className="text-[11px] font-semibold text-gray-500">
                {done}/{total} việc
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                <Zap size={13} />
                {investedMinutes > 0 ? `${formatMinutes(investedMinutes)} đã đầu tư` : 'Chưa ghi phút'}
              </span>
              <span className="text-[11px] font-semibold text-gray-500">{periodLabel}</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">{headline}</span>
            <p className="text-[13px] text-gray-500">{message}</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[460px]">
          {areas.map((a) => {
            const Icon = areaIcon(a.title);
            return (
              <div key={a.areaId} className="flex items-center gap-3 rounded-xl bg-[#f2f3ff] p-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${a.color}1f`, color: a.color }}
                >
                  <Icon size={20} />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[11px] font-semibold text-gray-500">{a.title}</span>
                  <span className="font-bold whitespace-nowrap text-gray-900">
                    {a.minutes > 0 ? formatMinutesShort(a.minutes) : `${a.total} việc`}
                  </span>
                  <span
                    className={
                      a.done >= a.total
                        ? 'text-[11px] font-semibold text-teal-700'
                        : 'text-[11px] font-semibold text-gray-500'
                    }
                  >
                    {a.done >= a.total ? 'Đã hoàn thành' : `Còn ${a.total - a.done} việc`}
                  </span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 rounded-xl bg-[#f2f3ff] p-3 sm:col-start-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Flame size={20} />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[11px] font-semibold text-gray-500">Kỷ luật liên tục</span>
              <span className="font-bold text-gray-900">{streak ? `${streak.current} ngày` : '—'}</span>
              <span className="truncate text-[11px] font-semibold text-amber-700">{streakNote}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
