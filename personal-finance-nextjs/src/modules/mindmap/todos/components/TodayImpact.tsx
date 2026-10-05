'use client';

import { Lightbulb, Plus, TrendingUp } from 'lucide-react';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { formatMinutes } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useCreateTodo } from '../hooks';
import { areaBreakdown, GrowthLookup } from '../lookup';

/** Mỗi lĩnh vực được đầu tư bao nhiêu trong ngày / tuần + gợi ý việc nên thêm từ trang Kế hoạch. */
export function TodayImpact({
  todos,
  lookup,
  dateKey,
  periodLabel,
}: {
  todos: Todo[];
  lookup: GrowthLookup;
  dateKey: string;
  periodLabel: string;
}) {
  const createTodo = useCreateTodo();
  const areas = areaBreakdown(todos, lookup);
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Việc nên làm tiếp (trang Kế hoạch) mà chưa có todo nào trong khoảng đang xem
  const linked = new Set(todos.flatMap((t) => t.nodes.map((n) => n.id)));
  const suggestion = (lookup.plan?.next ?? []).find((a) => !linked.has(a.nodeId));

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-sm">
      <span className="flex items-center gap-1.5 font-semibold text-gray-900">
        <TrendingUp size={19} className="text-teal-600" /> Tác động {periodLabel.toLowerCase()}
      </span>

      {areas.length === 0 ? (
        <p className="text-[13px] text-gray-400">Chưa có việc nào gắn với lĩnh vực.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {areas.map((a) => {
            const Icon = areaIcon(a.title);
            const p = a.total ? Math.round((a.done / a.total) * 100) : 0;
            return (
              <div key={a.areaId} className="flex items-center justify-between gap-2 rounded-xl bg-[#f2f3ff] p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${a.color}1f`, color: a.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-gray-900">{a.title}</span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {a.done}/{a.total} việc{a.minutes > 0 && ` • ${formatMinutes(a.minutes)}`}
                    </span>
                  </div>
                </div>
                <span
                  className={
                    p >= 100 ? 'text-xs font-semibold text-teal-700' : 'text-xs font-semibold text-violet-700'
                  }
                >
                  {p}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-1.5 rounded-xl bg-[#f2f3ff] p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-gray-500">Tiến độ {periodLabel.toLowerCase()}</span>
          <span className="font-bold text-violet-700">
            {done}/{total} việc ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e7ff]">
          <div
            className="h-full rounded-full bg-violet-700 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {suggestion && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <p className="text-[13px] text-gray-500">
              <Lightbulb size={14} className="mr-1 inline text-amber-500" />
              <b className="text-gray-900">Lời khuyên:</b> thêm “{suggestion.title}” ({suggestion.areaTitle})
              {suggestion.reasons.length > 0 &&
                ` — ${suggestion.reasons.slice(0, 2).join(', ').toLowerCase()}`}
              .
            </p>
            <button
              type="button"
              disabled={createTodo.isPending}
              onClick={() =>
                createTodo.mutate({
                  title: suggestion.title,
                  date: dateKey,
                  nodeIds: [suggestion.nodeId],
                  durationMinutes: 25,
                })
              }
              className="flex items-center justify-center gap-1 self-start rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-sm transition hover:shadow disabled:opacity-50"
            >
              <Plus size={14} /> Thêm vào ngày (25p)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
