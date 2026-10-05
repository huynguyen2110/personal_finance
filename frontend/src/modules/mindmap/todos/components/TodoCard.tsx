'use client';

import {
  BadgeCheck,
  Check,
  GitMerge,
  KeyRound,
  LockOpen,
  Share2,
  Timer,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { formatCompactVND } from '@/lib/money';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useDeleteTodo, useUpdateTodo } from '../hooks';
import { GrowthLookup } from '../lookup';
import { TodoEffort } from './TodoEffort';

function Strip({
  icon,
  label,
  children,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500',
        tone === 'danger' ? 'bg-red-50' : 'bg-[#f2f3ff]',
      )}
    >
      {icon}
      <span className={cn('shrink-0', tone === 'danger' ? 'font-bold text-red-600' : 'text-gray-900')}>
        {label}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
}

/** Một việc trong danh sách: nhánh gắn với, độ khó / thời lượng / chi phí, điểm đòn bẩy, mắt xích mở khóa. */
export function TodoCard({
  todo,
  lookup,
  focused,
  onFocus,
}: {
  todo: Todo;
  lookup: GrowthLookup;
  focused: boolean;
  onFocus: (todo: Todo) => void;
}) {
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const nodes = lookup.nodesOf(todo);
  const actions = nodes.flatMap((n) => (n.action ? [n.action] : []));
  const main = actions[0] ?? null;
  const score = lookup.scoreOf(todo);
  const areas = [...new Map(nodes.map((n) => [n.areaId, n])).values()];
  const done = todo.completed;

  const blockedBy = [...new Set(actions.flatMap((a) => (a.status !== 'done' ? a.blockedBy : [])).map((b) => b.title))];
  const unlocks = [...new Set(actions.flatMap((a) => a.unlocks).map((u) => u.title))];
  const supports = [...new Set(actions.flatMap((a) => a.supports).map((u) => u.title))];
  const isNext = nodes.some((n) => n.isNext);
  const scoreLabel = isNext ? 'Nên làm tiếp' : unlocks.length ? 'Mở khóa' : 'Đòn bẩy';

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl p-4 transition-shadow',
        done ? 'bg-white/80 opacity-90 shadow-sm' : 'bg-white shadow-sm hover:shadow-md',
        focused && 'ring-2 ring-violet-400',
      )}
    >
      <button
        type="button"
        aria-label={done ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
        onClick={() => updateTodo.mutate({ id: todo.id, completed: !done })}
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition',
          done
            ? 'bg-teal-600 text-white shadow-sm'
            : 'bg-[#e2e7ff] text-transparent hover:bg-violet-200 hover:text-violet-700',
        )}
      >
        <Check size={16} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'text-base font-semibold text-gray-900',
                done && 'line-through opacity-70',
              )}
            >
              {todo.title}
            </span>
            {!done && areas.length >= 2 && (
              <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                <Share2 size={12} /> Tác động kép
              </span>
            )}
          </div>
          {done ? (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
              Đã ghi nhận
            </span>
          ) : (
            score >= 0 && (
              <span className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-violet-700 tabular-nums">
                  {score}
                  <span className="ml-0.5 text-xs font-semibold">điểm</span>
                </span>
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {scoreLabel}
                </span>
              </span>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          {nodes.map((n) => {
            const Icon = areaIcon(n.areaTitle);
            return (
              <Link
                key={n.nodeId}
                href={growthRoutes.node(n.nodeId)}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 hover:underline"
                style={{ backgroundColor: `${n.color}14`, color: n.color }}
              >
                <Icon size={12} />
                {n.action ? `${n.areaTitle} › ${n.title}` : n.title}
              </Link>
            );
          })}
          {main?.difficulty && !done && (
            <span
              className="rounded-md px-1.5 py-0.5"
              style={{ backgroundColor: `${main.difficulty.color}1f`, color: main.difficulty.color }}
            >
              {main.difficulty.label}
            </span>
          )}
          {todo.durationMinutes !== null && (
            <>
              <span className="opacity-40">•</span>
              <span>{done ? `Đã đầu tư ${todo.durationMinutes} phút` : `${todo.durationMinutes} phút`}</span>
            </>
          )}
          {main?.cost !== null && main?.cost !== undefined && !done && (
            <>
              <span className="opacity-40">•</span>
              <span>{main.cost === 0 ? '0đ' : `${formatCompactVND(main.cost)}đ`}</span>
            </>
          )}
          {done && nodes.length > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span className="text-teal-700">Đã tích lũy vào tiến độ tuần</span>
            </>
          )}
        </div>

        {!done && (
          <div className="mt-1 flex flex-col gap-1">
            {blockedBy.length > 0 && (
              <Strip icon={<LockOpen size={15} className="shrink-0 text-red-600" />} label="Tiền đề bắt buộc:" tone="danger">
                cần xong “{blockedBy.join('”, “')}” trước
              </Strip>
            )}
            {areas.length >= 2 ? (
              <Strip icon={<GitMerge size={15} className="shrink-0 text-teal-600" />} label={`Bổ trợ ${areas.length} lĩnh vực:`}>
                <span className="text-violet-700">{areas.map((a) => a.areaTitle).join(' & ')}</span> cùng lúc
              </Strip>
            ) : unlocks.length > 0 ? (
              <Strip icon={<KeyRound size={15} className="shrink-0 text-violet-600" />} label="Góp phần mở khóa:">
                {unlocks.join(', ')}
              </Strip>
            ) : supports.length > 0 ? (
              <Strip icon={<Share2 size={15} className="shrink-0 text-teal-600" />} label="Bổ trợ cho:">
                {supports.join(', ')}
              </Strip>
            ) : null}
          </div>
        )}

        {/* Phút + mức hiệu quả: luôn hiện khi đã xong; chưa xong thì chỉ hiện khi hover / đang nhập */}
        <div
          className={cn(
            'mt-1',
            !done && 'hidden focus-within:block group-hover:block',
          )}
        >
          <TodoEffort todo={todo} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1">
        {done ? (
          <BadgeCheck size={20} className="text-teal-600" />
        ) : (
          <button
            type="button"
            aria-label="Bắt đầu phiên Focus cho việc này"
            title="Bắt đầu phiên Focus (Pomodoro) cho việc này"
            onClick={() => onFocus(todo)}
            className={cn(
              'rounded-lg p-1 transition hover:bg-[#eaedff]',
              focused ? 'bg-violet-100 text-violet-700' : 'text-violet-600',
            )}
          >
            <Timer size={20} />
          </button>
        )}
        <button
          type="button"
          aria-label="Xóa todo"
          onClick={() => deleteTodo.mutate(todo.id)}
          className="rounded-lg p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
