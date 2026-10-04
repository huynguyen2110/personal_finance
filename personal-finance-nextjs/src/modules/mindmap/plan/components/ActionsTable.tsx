'use client';

import { ArrowDown, ArrowUp, Lock } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatCompactVND } from '@/lib/money';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn, formatMinutes, formatRating } from '@/modules/mindmap/lib/utils';
import { PlanAction, PlanArea } from '../api';
import { AddTodoButton, OptionBadge, StatusSelect } from './parts';

type SortKey = 'score' | 'title' | 'hours' | 'cost' | 'minutes';
type StatusFilter = 'open' | 'done' | 'all';

const sortValue: Record<SortKey, (a: PlanAction) => number | string> = {
  score: (a) => a.score,
  title: (a) => a.title.toLocaleLowerCase('vi'),
  hours: (a) => a.hours ?? -1,
  cost: (a) => a.cost ?? -1,
  minutes: (a) => a.todos.minutes,
};

const filterClass =
  'rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none focus:border-violet-500';

/** Bảng mọi hành động: sắp xếp theo cột, lọc theo lĩnh vực / trạng thái. */
export function ActionsTable({
  mindmapId,
  actions,
  areas,
  windowDays,
}: {
  mindmapId: number;
  actions: PlanAction[];
  areas: PlanArea[];
  windowDays: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: 'score',
    desc: true,
  });
  const [areaId, setAreaId] = useState<number | ''>('');
  const [status, setStatus] = useState<StatusFilter>('open');

  const rows = useMemo(() => {
    const filtered = actions.filter(
      (a) =>
        (areaId === '' || a.areaId === areaId) &&
        (status === 'all' ||
          (status === 'done') === (a.status === 'done')),
    );
    const get = sortValue[sort.key];
    return filtered.sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp =
        typeof va === 'string'
          ? va.localeCompare(vb as string, 'vi')
          : va - (vb as number);
      return sort.desc ? -cmp : cmp;
    });
  }, [actions, areaId, status, sort]);

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={cn('px-2 py-2 font-medium', className)}>
      <button
        onClick={() =>
          setSort((s) =>
            s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'title' },
          )
        }
        className="inline-flex items-center gap-0.5 hover:text-gray-700"
      >
        {label}
        {sort.key === key &&
          (sort.desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
      </button>
    </th>
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Tất cả hành động{' '}
          <span className="font-normal text-gray-400">({rows.length})</span>
        </h2>
        <div className="flex gap-2">
          <select
            value={areaId}
            onChange={(e) =>
              setAreaId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className={filterClass}
          >
            <option value="">Mọi lĩnh vực</option>
            {areas.map((a) => (
              <option key={a.nodeId} value={a.nodeId}>
                {a.title}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={filterClass}
          >
            <option value="open">Chưa xong</option>
            <option value="done">Đã xong</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-400">
          Không có hành động nào khớp bộ lọc.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-gray-400">
              <tr>
                {header('title', 'Hành động', 'pl-4')}
                <th className="px-2 py-2 font-medium">Ưu tiên</th>
                <th className="px-2 py-2 font-medium">Độ khó</th>
                {header('hours', 'Thời gian', 'text-right')}
                {header('cost', 'Chi phí', 'text-right')}
                <th className="px-2 py-2 font-medium">Liên kết</th>
                {header('minutes', `${windowDays} ngày`, 'text-right')}
                <th className="px-2 py-2 font-medium">Trạng thái</th>
                {header('score', 'Điểm', 'text-right')}
                <th className="pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((a) => (
                <tr
                  key={a.nodeId}
                  className={cn(a.status === 'done' && 'text-gray-400')}
                >
                  <td className="max-w-64 py-2 pl-4 pr-2">
                    <Link
                      href={growthRoutes.node(a.nodeId)}
                      className={cn(
                        'block truncate font-medium hover:text-violet-700',
                        a.status === 'done' && 'line-through',
                      )}
                      style={{ paddingLeft: `${(a.depth - 2) * 12}px` }}
                    >
                      {a.title}
                    </Link>
                    <span className="block truncate text-xs text-gray-400">
                      {a.areaTitle}
                    </span>
                  </td>
                  <td className="px-2">
                    <OptionBadge option={a.priority} muted={a.priorityInherited} />
                  </td>
                  <td className="px-2">
                    <OptionBadge option={a.difficulty} />
                  </td>
                  <td className="px-2 text-right tabular-nums">
                    {a.hours !== null ? `${a.hours} giờ` : '—'}
                  </td>
                  <td className="px-2 text-right tabular-nums">
                    {a.cost !== null
                      ? a.cost === 0
                        ? '0₫'
                        : `${formatCompactVND(a.cost)}₫`
                      : '—'}
                  </td>
                  <td className="px-2 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {a.blockedBy.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-orange-50 px-1 text-orange-700"
                          title={`Cần xong trước: ${a.blockedBy.map((b) => b.title).join(', ')}`}
                        >
                          <Lock size={10} /> {a.blockedBy.length}
                        </span>
                      )}
                      {a.unlocks.length > 0 && (
                        <span
                          className="rounded bg-orange-50 px-1 text-orange-700"
                          title={`Mở khóa: ${a.unlocks.map((u) => u.title).join(', ')}`}
                        >
                          mở {a.unlocks.length}
                        </span>
                      )}
                      {a.supports.length > 0 && (
                        <span
                          className="rounded bg-green-50 px-1 text-green-700"
                          title={`Bổ trợ: ${a.supports.map((u) => u.title).join(', ')}`}
                        >
                          trợ {a.supports.length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 text-right text-xs tabular-nums text-gray-500">
                    {a.todos.minutes > 0
                      ? formatMinutes(a.todos.minutes)
                      : a.todos.total > 0
                        ? `${a.todos.done}/${a.todos.total} todo`
                        : '—'}
                    {a.todos.avgEffectiveness !== null &&
                      ` · ${formatRating(a.todos.avgEffectiveness)}`}
                  </td>
                  <td className="px-2">
                    <StatusSelect
                      mindmapId={mindmapId}
                      nodeId={a.nodeId}
                      status={a.status}
                    />
                  </td>
                  <td className="px-2 text-right font-semibold tabular-nums">
                    {a.score}
                  </td>
                  <td className="pr-4">
                    {a.status !== 'done' && (
                      <AddTodoButton nodeId={a.nodeId} title={a.title} compact />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
