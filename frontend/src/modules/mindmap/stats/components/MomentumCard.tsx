'use client';

import { Check, ListPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { addDays, toDateKey } from '@/modules/mindmap/lib/utils';
import { Plan } from '@/modules/mindmap/plan/api';
import { useCreateTodo } from '@/modules/mindmap/todos/hooks';
import { AreaStat, RangeStats } from '../api';

/**
 * Momentum 0–100 = 40% tỷ lệ hoàn thành + 35% phút/ngày (30 phút = đủ) + 25% chuỗi ngày (14 ngày = đủ).
 */
export function momentumScore(data: RangeStats, elapsed: number, streak: number): number {
  const rate = data.totals.total ? data.totals.done / data.totals.total : 0;
  const perDay = elapsed ? data.totals.minutes / elapsed : 0;
  return Math.round(100 * (0.4 * rate + 0.35 * Math.min(1, perDay / 30) + 0.25 * Math.min(1, streak / 14)));
}

/** Lĩnh vực cần cân bằng: ưu tiên cao bị bỏ quên > ưu tiên cao ít phút nhất > ít phút nhất. */
function balanceTarget(plan: Plan | undefined, byArea: AreaStat[]) {
  const areas = (plan?.areas ?? []).filter((a) => a.actionsTotal > 0 && a.status !== 'done');
  if (!areas.length) return null;
  const minutesOf = (id: number) => byArea.find((b) => b.areaId === id)?.minutes ?? 0;
  const high = (a: { priorityLevel: number | null }) => Number((a.priorityLevel ?? 0) >= 0.75);
  return (
    areas.find((a) => a.neglected) ??
    [...areas].sort((a, b) => high(b) - high(a) || minutesOf(a.nodeId) - minutesOf(b.nodeId))[0]
  );
}

export function MomentumCard({
  data,
  plan,
  elapsed,
  streak,
}: {
  data: RangeStats;
  plan: Plan | undefined;
  elapsed: number;
  streak: number;
}) {
  const createTodo = useCreateTodo();
  const [added, setAdded] = useState(false);
  const score = momentumScore(data, elapsed, streak);
  const [badge, tone] =
    score >= 70 ? ['Đà tăng trưởng tốt', 'bg-violet-700'] : score >= 40 ? ['Đang giữ nhịp', 'bg-teal-700'] : ['Cần lấy lại đà', 'bg-amber-700'];

  const top = [...data.byArea].sort((a, b) => b.minutes - a.minutes)[0];
  const target = balanceTarget(plan, data.byArea);
  // Việc nên làm trong lĩnh vực cần cân bằng (điểm cao nhất, làm được ngay)
  const action = target
    ? plan?.actions
        .filter((a) => a.areaId === target.nodeId && a.status !== 'done' && !a.blockedBy.length && !a.hasOpenChildren)
        .sort((a, b) => b.score - a.score)[0]
    : undefined;

  return (
    <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-br from-[#e2e7ff] via-[#eaedff] to-[#f2f3ff] p-6 shadow-sm lg:flex-row">
      <div className="flex w-full items-center gap-4 lg:w-auto">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${score} 100`}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[22px] font-bold tracking-tighter text-violet-700">{score}</span>
            <span className="text-[10px] font-medium text-gray-500">MOMENTUM</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold text-white ${tone}`}>{badge}</span>
            <span className="text-[11px] font-semibold text-gray-500">Chuỗi {streak} ngày liên tục</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">Lời khuyên cho ngày mai</h3>
          <p className="max-w-2xl text-sm text-gray-500">
            {target ? (
              <>
                {top && top.minutes > 0 && top.areaId !== target.nodeId && (
                  <>Kỳ này bạn đầu tư nhiều nhất cho {top.title}. </>
                )}
                Dành ít nhất <b className="text-gray-900">25 phút cho {target.title}</b>
                {action && <> (gợi ý: “{action.title}”)</>} vào ngày mai
                {target.neglected
                  ? ' — lĩnh vực ưu tiên cao này đã 14 ngày chưa có hoạt động.'
                  : ' để giữ cân bằng giữa các lĩnh vực.'}
              </>
            ) : (
              'Thêm lĩnh vực và hành động trên sơ đồ để nhận gợi ý cân bằng.'
            )}
          </p>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col items-center gap-2 sm:flex-row lg:w-auto">
        {target && (
          <button
            type="button"
            disabled={createTodo.isPending || added}
            onClick={() =>
              createTodo.mutate(
                {
                  title: action?.title ?? `25 phút cho ${target.title}`,
                  date: addDays(toDateKey(new Date()), 1),
                  nodeIds: [action?.nodeId ?? target.nodeId],
                  durationMinutes: 25,
                },
                { onSuccess: () => setAdded(true) },
              )
            }
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-70 sm:w-auto"
          >
            {added ? <Check size={17} /> : <ListPlus size={17} />}
            {added ? 'Đã thêm vào ngày mai' : 'Thêm todo cân bằng'}
          </button>
        )}
        <Link
          href={growthRoutes.plan}
          className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-[#dae2fd] sm:w-auto"
        >
          Xem kế hoạch
        </Link>
      </div>
    </div>
  );
}
