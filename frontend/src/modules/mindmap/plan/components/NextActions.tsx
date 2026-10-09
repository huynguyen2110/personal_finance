'use client';

import { ChevronDown, KeyRound, Link2, Lock, LockOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn } from '@/modules/mindmap/lib/utils';
import { PlanAction } from '../api';
import { AddTodoButton, StatusSelect } from './parts';

/** Nhãn ngắn dưới điểm: vì sao việc này đáng làm. */
function scoreLabel(a: PlanAction): string {
  if (a.unlocks.length) return 'Đòn bẩy cao';
  if (a.status === 'doing' && a.todos.minutes > 0) return 'Đang có đà';
  if (a.cost === 0) return 'ROI cao';
  if (a.difficulty && a.reasons.includes(a.difficulty.label)) return 'Dễ bắt đầu';
  return 'Nên làm';
}

/** Chip lý do (bỏ các lý do đã thể hiện bằng chip ưu tiên / độ khó). */
function ReasonChip({ text }: { text: string }) {
  if (text === 'Đang làm dở') {
    return (
      <span className="flex items-center gap-1 rounded bg-[#eaedff] px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-600" /> Đang làm dở
      </span>
    );
  }
  if (text.startsWith('Mở khóa')) {
    return (
      <span className="flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 font-semibold text-violet-800">
        <LockOpen size={13} /> {text}
      </span>
    );
  }
  if (text.startsWith('Bổ trợ')) {
    return (
      <span className="flex items-center gap-1 rounded bg-[#eaedff] px-2 py-0.5">
        <Link2 size={13} className="text-violet-600" /> {text}
      </span>
    );
  }
  if (text.startsWith('Có đà')) {
    return <span className="rounded bg-[#eaedff] px-2 py-0.5 font-medium text-teal-700">{text}</span>;
  }
  return <span className="rounded bg-[#eaedff] px-2 py-0.5">{text}</span>;
}

function ActionCard({
  mindmapId,
  action: a,
  rank,
  color,
}: {
  mindmapId: number;
  action: PlanAction;
  rank: number;
  color: string;
}) {
  const reasons = a.reasons.filter((r) => !/ưu tiên/i.test(r) && r !== a.difficulty?.label);
  const top = rank <= 2;
  return (
    <div className="group relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl bg-white p-4 pl-5 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center">
      <div
        className="absolute top-0 bottom-0 left-0 w-1.5"
        style={{ backgroundColor: top ? '#7c3aed' : `${color}66` }}
      />
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-semibold shadow-sm',
            top ? 'bg-violet-600 text-white' : 'bg-[#e2e7ff] text-gray-900',
          )}
        >
          {rank}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={growthRoutes.node(a.nodeId)}
              className="text-lg font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-violet-700"
            >
              {a.title}
            </Link>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              {a.areaTitle}
            </span>
            {a.priority && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: `${a.priority.color}1f`, color: a.priority.color }}
                title={a.priorityInherited ? 'Ưu tiên lấy từ lĩnh vực' : undefined}
              >
                Ưu tiên {a.priority.label}
                {a.priorityInherited && ' (lĩnh vực)'}
              </span>
            )}
            {a.difficulty && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: `${a.difficulty.color}1f`, color: a.difficulty.color }}
              >
                Độ khó: {a.difficulty.label}
              </span>
            )}
          </div>
          {reasons.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[11px] font-semibold text-gray-500">
              {reasons.map((r) => (
                <ReasonChip key={r} text={r} />
              ))}
            </div>
          )}
          {a.unlocks.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-500">
              <KeyRound size={14} className="shrink-0 text-violet-600" />
              <span className="truncate">
                Xong việc này sẽ mở:{' '}
                <b className="text-gray-900">{a.unlocks.map((u) => u.title).join(', ')}</b>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-100 pt-2 md:justify-end md:border-t-0 md:pt-0">
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'text-2xl font-bold tracking-tight tabular-nums',
                top ? 'text-violet-700' : 'text-gray-900',
              )}
            >
              {a.score}
            </span>
            <span className="text-[11px] font-semibold text-gray-500">điểm</span>
          </div>
          <span className={cn('text-[11px] font-semibold', top ? 'text-teal-700' : 'text-gray-500')}>
            {scoreLabel(a)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusSelect mindmapId={mindmapId} nodeId={a.nodeId} status={a.status} />
          <AddTodoButton nodeId={a.nodeId} title={a.title} />
        </div>
      </div>
    </div>
  );
}

const PAGE = 5;

/** Danh sách hành động nên làm (chưa xong, không bị chặn, không còn bước con) — xếp theo điểm. */
export function PriorityList({
  mindmapId,
  actions,
  colorOf,
}: {
  mindmapId: number;
  actions: PlanAction[];
  colorOf: (nodeId: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? actions : actions.slice(0, PAGE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Nên làm tiếp theo</h2>
            <p className="text-[11px] font-semibold text-gray-500">
              Xếp hạng tự động theo ưu tiên, độ dễ, mắt xích mở khóa, chi phí và thời gian
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#eaedff] px-2 py-1 text-[11px] font-semibold text-gray-900">
          Đang hiển thị: <b className="text-violet-700">{shown.length}</b> / {actions.length} hành động
        </span>
      </div>

      {actions.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Không có hành động nào khớp. Thêm hành động bằng ô bên dưới, hoặc bỏ bớt bộ lọc.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((a, i) => (
            <ActionCard
              key={a.nodeId}
              mindmapId={mindmapId}
              action={a}
              rank={i + 1}
              color={colorOf(a.nodeId)}
            />
          ))}
          {actions.length > PAGE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center justify-center gap-1 self-center rounded-lg px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-[#eaedff]"
            >
              <ChevronDown size={15} className={cn('transition', expanded && 'rotate-180')} />
              {expanded ? 'Thu gọn' : `Xem thêm ${actions.length - PAGE} hành động`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Việc đang bị chặn bởi điều kiện trước chưa xong, kèm tiến độ mở khóa. */
export function BlockedPanel({ actions }: { actions: PlanAction[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-gray-900">
          <Lock size={19} /> Đang bị chặn
        </span>
        <span className="rounded-full bg-[#eaedff] px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          {actions.length} việc
        </span>
      </div>
      <p className="text-[11px] font-semibold text-gray-500">
        Cần hoàn thành điều kiện tiên quyết trước khi mở khóa — tránh dàn trải sức.
      </p>
      {actions.length === 0 ? (
        <p className="text-[13px] text-gray-400">Không có việc nào bị chặn.</p>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          {actions.map((a) => {
            const total = Math.max(a.prerequisiteTotal, a.blockedBy.length);
            const doneCount = total - a.blockedBy.length;
            const pct = total ? Math.round((doneCount / total) * 100) : 0;
            return (
              <div key={a.nodeId} className="flex flex-col gap-1 rounded-lg bg-[#f2f3ff] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={growthRoutes.node(a.nodeId)}
                    className="truncate font-semibold text-gray-900 hover:text-violet-700"
                  >
                    {a.title}
                  </Link>
                  <Lock size={15} className="shrink-0 text-gray-400" />
                </div>
                <div className="text-[13px] text-gray-500">
                  Cần xong trước:{' '}
                  {a.blockedBy.map((b, i) => (
                    <span key={b.nodeId}>
                      {i > 0 && ', '}
                      <Link href={growthRoutes.node(b.nodeId)} className="font-semibold text-amber-800 hover:underline">
                        {b.title}
                      </Link>
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 w-full rounded-full bg-[#e2e7ff]">
                    <div className="h-1 rounded-full bg-amber-700" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-gray-500 tabular-nums">
                    {doneCount}/{total} điều kiện
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
