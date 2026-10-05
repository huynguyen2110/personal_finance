'use client';

import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { PlanAction } from '../api';
import { AddTodoButton, OptionBadge, StatusSelect } from './parts';

/** Top hành động nên làm tiếp (chưa xong, không bị chặn), kèm lý do. */
export function NextActions({
  mindmapId,
  actions,
}: {
  mindmapId: number;
  actions: PlanAction[];
}) {
  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/60 to-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-900">
        <Sparkles size={15} /> Nên làm tiếp
      </h2>
      {actions.length === 0 ? (
        <p className="text-sm text-gray-500">
          Chưa có hành động nào để gợi ý. Thêm hành động (nhánh cấp 2 trở
          xuống) dưới các lĩnh vực trên sơ đồ.
        </p>
      ) : (
        <ol className="space-y-2">
          {actions.map((a, i) => (
            <li
              key={a.nodeId}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={growthRoutes.node(a.nodeId)}
                    className="font-medium hover:text-violet-700"
                  >
                    {a.title}
                  </Link>
                  <span className="text-xs text-gray-400">{a.areaTitle}</span>
                  <OptionBadge
                    option={a.priority}
                    muted={a.priorityInherited}
                    title={
                      a.priorityInherited
                        ? 'Ưu tiên lấy từ lĩnh vực'
                        : 'Ưu tiên'
                    }
                  />
                  <OptionBadge option={a.difficulty} title="Độ khó" />
                </div>
                {a.reasons.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {a.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                {a.unlocks.length > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Lock size={11} /> Xong việc này sẽ mở:{' '}
                    {a.unlocks.map((u) => u.title).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className="text-lg font-bold tabular-nums text-violet-700"
                  title="Điểm gợi ý (0–100)"
                >
                  {a.score}
                </span>
                <StatusSelect
                  mindmapId={mindmapId}
                  nodeId={a.nodeId}
                  status={a.status}
                />
                <AddTodoButton nodeId={a.nodeId} title={a.title} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Việc đang bị chặn bởi điều kiện trước chưa xong. */
export function BlockedList({ actions }: {
  actions: PlanAction[];
}) {
  if (actions.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Lock size={14} /> Đang bị chặn
      </h2>
      <ul className="space-y-2">
        {actions.map((a) => (
          <li key={a.nodeId} className="text-sm">
            <Link
              href={growthRoutes.node(a.nodeId)}
              className="font-medium hover:text-violet-700"
            >
              {a.title}
            </Link>
            <span className="text-gray-400"> — cần xong trước: </span>
            {a.blockedBy.map((b, i) => (
              <span key={b.nodeId}>
                {i > 0 && ', '}
                <Link
                  href={growthRoutes.node(b.nodeId)}
                  className="text-orange-700 hover:underline"
                >
                  {b.title}
                </Link>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
