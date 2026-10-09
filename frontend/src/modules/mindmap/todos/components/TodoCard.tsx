'use client';

import {
  Check,
  Clock,
  GitMerge,
  KeyRound,
  Link2,
  LockOpen,
  Share2,
  Star,
  Timer,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatCompactVND } from '@/lib/money';
import { GOption, GSelect } from '@/modules/mindmap/components/ui/GSelect';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn, formatMinutes } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useDeleteTodo, useUpdateTodo } from '../hooks';
import { GrowthLookup } from '../lookup';

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
      <span className={cn('shrink-0', tone === 'danger' ? 'font-bold text-red-600' : 'text-gray-900')}>{label}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

const chip = 'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold';

/** Thời lượng dạng chip; bấm để sửa (Enter / bỏ focus để lưu, Esc để hủy). */
function MinutesChip({ todo }: { todo: Todo }) {
  const updateTodo = useUpdateTodo();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const done = todo.completed;

  const start = () => {
    setValue(todo.durationMinutes === null ? '' : String(todo.durationMinutes));
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const parsed = value.trim() === '' ? null : Math.min(1440, Math.max(0, Math.round(Number(value))));
    if (parsed !== null && Number.isNaN(parsed)) return;
    if (parsed !== todo.durationMinutes) updateTodo.mutate({ id: todo.id, durationMinutes: parsed });
  };

  if (editing) {
    return (
      <span className={cn(chip, 'bg-white ring-2 ring-violet-300')}>
        <Clock size={12} className="text-violet-600" />
        <input
          autoFocus
          type="number"
          min={0}
          max={1440}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-12 bg-transparent text-right outline-none"
        />
        phút
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={start}
      title={done ? 'Sửa số phút đã đầu tư' : 'Sửa thời lượng dự kiến'}
      className={cn(
        chip,
        'transition',
        todo.durationMinutes === null
          ? 'border border-dashed border-[#ccc3d8] text-gray-400 hover:border-violet-400 hover:text-violet-700'
          : done
            ? 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            : 'bg-[#f2f3ff] text-gray-600 hover:bg-[#eaedff]',
      )}
    >
      <Clock size={12} />
      {todo.durationMinutes === null
        ? 'Thời lượng'
        : done
          ? `Đã đầu tư ${formatMinutes(todo.durationMinutes)}`
          : formatMinutes(todo.durationMinutes)}
    </button>
  );
}

/** Chấm hiệu quả 1–5 (bấm lại sao đang chọn để xóa). */
function Rating({ todo }: { todo: Todo }) {
  const updateTodo = useUpdateTodo();
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500" title="Mức hiệu quả">
      Hiệu quả
      <span className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() =>
              updateTodo.mutate({ id: todo.id, effectiveness: todo.effectiveness === n ? null : n })
            }
            className="p-px"
          >
            <Star
              size={13}
              className={cn(
                todo.effectiveness !== null && n <= todo.effectiveness
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300 hover:text-amber-300',
              )}
            />
          </button>
        ))}
      </span>
    </span>
  );
}

/** Lựa chọn nhánh để gắn nhanh: Lĩnh vực, rồi các hành động bên dưới (xếp theo điểm). */
function nodeOptions(lookup: GrowthLookup): GOption<number>[] {
  const plan = lookup.plan;
  if (!plan) return [];
  return plan.areas.flatMap((area) => {
    const Icon = areaIcon(area.title);
    const color = lookup.info.get(area.nodeId)?.color ?? '#7c3aed';
    return [
      {
        value: area.nodeId,
        label: area.title,
        group: area.title,
        icon: <Icon size={14} style={{ color }} />,
        meta: 'cả lĩnh vực',
      },
      ...plan.actions
        .filter((a) => a.areaId === area.nodeId && a.status !== 'done')
        .sort((a, b) => b.score - a.score)
        .map((a) => ({
          value: a.nodeId,
          label: a.title,
          group: area.title,
          depth: 1 as const,
          meta: `${a.score} điểm`,
          keywords: `${a.title} ${area.title}`,
        })),
    ];
  });
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
  const accent = done ? '#14b8a6' : (nodes[0]?.color ?? '#dae2fd');

  const blockedBy = [...new Set(actions.flatMap((a) => (a.status !== 'done' ? a.blockedBy : [])).map((b) => b.title))];
  const unlocks = [...new Set(actions.flatMap((a) => a.unlocks).map((u) => u.title))];
  const supports = [...new Set(actions.flatMap((a) => a.supports).map((u) => u.title))];
  const isNext = nodes.some((n) => n.isNext);
  const scoreLabel = isNext ? 'Nên làm tiếp' : unlocks.length ? 'Mở khóa' : 'Đòn bẩy';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 overflow-hidden rounded-xl bg-white py-3.5 pr-3 pl-5 shadow-sm transition-shadow hover:shadow-md',
        done && 'bg-white/80',
        focused && 'ring-2 ring-violet-400',
      )}
    >
      <span className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: accent }} />

      <button
        type="button"
        aria-label={done ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
        onClick={() => updateTodo.mutate({ id: todo.id, completed: !done })}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition',
          done
            ? 'border-teal-600 bg-teal-600 text-white'
            : 'border-[#ccc3d8] bg-white text-transparent hover:border-violet-500 hover:text-violet-500',
        )}
      >
        <Check size={13} strokeWidth={3} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={cn('text-[15px] font-semibold text-gray-900', done && 'text-gray-500 line-through')}>
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
                <span className="text-lg leading-none font-bold tracking-tight text-violet-700 tabular-nums">
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

        {/* Hàng chip: nhánh (hoặc gắn nhanh), độ khó, thời lượng, chi phí */}
        <div className="flex flex-wrap items-center gap-1.5">
          {nodes.length > 0 ? (
            nodes.map((n) => {
              const Icon = areaIcon(n.areaTitle);
              return (
                <Link
                  key={n.nodeId}
                  href={growthRoutes.node(n.nodeId)}
                  className={cn(chip, 'hover:underline')}
                  style={{ backgroundColor: `${n.color}14`, color: n.color }}
                >
                  <Icon size={12} />
                  {n.action ? `${n.areaTitle} › ${n.title}` : n.title}
                </Link>
              );
            })
          ) : (
            <span className="w-52">
              <GSelect
                size="sm"
                options={nodeOptions(lookup)}
                value={null}
                onChange={(v) => v !== null && updateTodo.mutate({ id: todo.id, nodeIds: [v] })}
                placeholder="Gắn vào nhánh…"
                placeholderIcon={<Link2 size={13} className="text-gray-400" />}
                searchPlaceholder="Tìm lĩnh vực / hành động…"
                ariaLabel="Gắn vào nhánh"
              />
            </span>
          )}
          {main?.difficulty && !done && (
            <span
              className={chip}
              style={{ backgroundColor: `${main.difficulty.color}1f`, color: main.difficulty.color }}
            >
              {main.difficulty.label}
            </span>
          )}
          <MinutesChip todo={todo} />
          {main?.cost !== null && main?.cost !== undefined && !done && (
            <span className={cn(chip, 'bg-[#f2f3ff] text-gray-600')}>
              {main.cost === 0 ? '0đ' : `${formatCompactVND(main.cost)}đ`}
            </span>
          )}
          {done && <Rating todo={todo} />}
        </div>

        {!done && (blockedBy.length > 0 || areas.length >= 2 || unlocks.length > 0 || supports.length > 0) && (
          <div className="flex flex-col gap-1">
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
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label="Xóa todo"
          title="Xóa"
          onClick={() => deleteTodo.mutate(todo.id)}
          className="rounded-lg p-1.5 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100"
        >
          <Trash2 size={15} />
        </button>
        {!done && (
          <button
            type="button"
            aria-label="Bắt đầu phiên Focus cho việc này"
            title="Bắt đầu phiên Focus (Pomodoro) cho việc này"
            onClick={() => onFocus(todo)}
            className={cn(
              'rounded-lg p-1.5 transition hover:bg-[#eaedff]',
              focused ? 'bg-violet-100 text-violet-700' : 'text-violet-600',
            )}
          >
            <Timer size={19} />
          </button>
        )}
      </div>
    </div>
  );
}
