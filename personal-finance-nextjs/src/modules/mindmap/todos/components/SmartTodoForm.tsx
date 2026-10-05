'use client';

import { ChevronDown, KeyRound, ListPlus, Lock, PenLine, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { formatCompactVND } from '@/lib/money';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { cn } from '@/modules/mindmap/lib/utils';
import { useCreateTodo } from '../hooks';
import { GrowthLookup } from '../lookup';

const DURATIONS: [number | '', string][] = [
  ['', 'Chưa ước lượng thời gian'],
  [15, '15 phút (khởi động)'],
  [25, '25 phút (1 Pomodoro)'],
  [45, '45 phút (khối sâu)'],
  [60, '1 giờ'],
  [90, '1 giờ 30 phút'],
];

const selectClass =
  'w-full cursor-pointer appearance-none rounded-xl bg-[#f2f3ff] px-3 py-2 pr-8 text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-violet-300';

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={selectClass}>
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

/** Thêm việc cho ngày đang xem, gắn thẳng vào lĩnh vực / hành động trên bản đồ. */
export function SmartTodoForm({ dateKey, lookup }: { dateKey: string; lookup: GrowthLookup }) {
  const createTodo = useCreateTodo();
  const [title, setTitle] = useState('');
  const [nodeId, setNodeId] = useState<number | ''>('');
  const [minutes, setMinutes] = useState<number | ''>(25);

  const areas = lookup.plan?.areas ?? [];
  const actions = lookup.plan?.actions ?? [];
  const selected = nodeId === '' ? null : lookup.info.get(nodeId);
  const action = selected?.action ?? null;

  const submit = () => {
    const t = title.trim() || action?.title || '';
    if (!t) return;
    createTodo.mutate(
      {
        title: t,
        date: dateKey,
        nodeIds: nodeId === '' ? [] : [nodeId],
        durationMinutes: minutes === '' ? null : minutes,
      },
      { onSuccess: () => setTitle('') },
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-violet-700">
          <ListPlus size={19} /> Thêm hành động cho ngày
        </span>
        <span className="text-[11px] font-semibold text-gray-500">Gắn trực tiếp vào Bản đồ năng lực</span>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-[#f2f3ff] px-3 py-2 transition focus-within:ring-2 focus-within:ring-violet-300">
        <PenLine size={19} className="shrink-0 text-gray-400" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={action ? `Bỏ trống = “${action.title}”` : 'Việc cụ thể hôm nay cần hoàn thành…'}
          className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <Select
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label="Gắn với nhánh"
        >
          <option value="">Không gắn nhánh nào</option>
          {areas.map((area) => (
            <optgroup key={area.nodeId} label={area.title}>
              <option value={area.nodeId}>{area.title} (cả lĩnh vực)</option>
              {actions
                .filter((a) => a.areaId === area.nodeId && a.status !== 'done')
                .sort((a, b) => b.score - a.score)
                .map((a) => (
                  <option key={a.nodeId} value={a.nodeId}>
                    {area.title} › {a.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
        <Select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label="Thời lượng dự kiến"
        >
          {DURATIONS.map(([v, label]) => (
            <option key={label} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          {action ? (
            <>
              {action.difficulty && (
                <span
                  className="rounded-md px-1.5 py-0.5"
                  style={{ backgroundColor: `${action.difficulty.color}1f`, color: action.difficulty.color }}
                >
                  {action.difficulty.label}
                </span>
              )}
              {action.cost !== null && <span>{action.cost === 0 ? '0đ' : `${formatCompactVND(action.cost)}đ`}</span>}
              <span className="text-violet-700">{action.score} điểm</span>
              {selected?.isNext && (
                <span className="flex items-center gap-1 text-teal-700">
                  <TrendingUp size={14} /> Đang trong danh sách “Nên làm tiếp”
                </span>
              )}
              {action.blockedBy.length > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <Lock size={13} /> Cần xong “{action.blockedBy[0].title}” trước
                </span>
              )}
              {action.unlocks.length > 0 && (
                <span className="flex items-center gap-1 text-violet-700">
                  <KeyRound size={13} /> Mở khóa {action.unlocks.length} việc
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1">
              <TrendingUp size={14} className="text-teal-600" /> Gắn với hành động để việc được tính điểm đòn bẩy
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={createTodo.isPending || (!title.trim() && !action)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-violet-800 disabled:opacity-50',
          )}
        >
          <Plus size={17} /> Thêm vào ngày
        </button>
      </div>
      {createTodo.isError && <p className="text-xs text-red-600">{extractErrorMessage(createTodo.error)}</p>}
    </div>
  );
}
