'use client';

import { Clock, KeyRound, Link2, ListPlus, Lock, PenLine, Plus, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCompactVND } from '@/lib/money';
import { Dot, GOption, GSelect } from '@/modules/mindmap/components/ui/GSelect';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { cn } from '@/modules/mindmap/lib/utils';
import { useCreateTodo } from '../hooks';
import { GrowthLookup } from '../lookup';

const DURATION_OPTIONS: GOption<number>[] = [
  { value: 15, label: '15 phút', meta: 'khởi động' },
  { value: 25, label: '25 phút', meta: '1 Pomodoro' },
  { value: 45, label: '45 phút', meta: 'khối sâu' },
  { value: 60, label: '1 giờ' },
  { value: 90, label: '1 giờ 30 phút' },
  { value: 120, label: '2 giờ', meta: 'khối rất sâu' },
].map((o) => ({ ...o, icon: <Clock size={14} className="text-gray-400" /> }));

/** Thêm việc cho ngày đang xem, gắn thẳng vào lĩnh vực / hành động trên bản đồ. */
export function SmartTodoForm({ dateKey, lookup }: { dateKey: string; lookup: GrowthLookup }) {
  const createTodo = useCreateTodo();
  const [title, setTitle] = useState('');
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(25);

  const selected = nodeId === null ? null : lookup.info.get(nodeId);

  // Cây 2 cấp: lĩnh vực → hành động chưa xong (điểm cao trước), kèm điểm ở bên phải
  const nodeOptions = useMemo<GOption<number>[]>(
    () =>
      (lookup.plan?.areas ?? []).flatMap((area) => {
        const color = lookup.info.get(area.nodeId)?.color ?? '#7c3aed';
        const Icon = areaIcon(area.title);
        return [
          {
            value: area.nodeId,
            label: area.title,
            meta: 'cả lĩnh vực',
            icon: <Icon size={15} style={{ color }} />,
          },
          ...(lookup.plan?.actions ?? [])
            .filter((a) => a.areaId === area.nodeId && a.status !== 'done')
            .sort((a, b) => b.score - a.score)
            .map((a) => ({
              value: a.nodeId,
              label: a.title,
              depth: 1 as const,
              meta: `${a.score} điểm`,
              keywords: area.title,
              icon: <Dot color={color} />,
            })),
        ];
      }),
    [lookup.plan, lookup.info],
  );
  const action = selected?.action ?? null;

  const submit = () => {
    const t = title.trim() || action?.title || '';
    if (!t) return;
    createTodo.mutate(
      {
        title: t,
        date: dateKey,
        nodeIds: nodeId === null ? [] : [nodeId],
        durationMinutes: minutes,
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
        <GSelect
          options={nodeOptions}
          value={nodeId}
          onChange={setNodeId}
          clearable
          placeholder="Không gắn nhánh nào"
          placeholderIcon={<Link2 size={15} className="text-gray-400" />}
          searchPlaceholder="Tìm lĩnh vực / hành động…"
          ariaLabel="Gắn với nhánh"
        />
        <GSelect
          options={DURATION_OPTIONS}
          value={minutes}
          onChange={setMinutes}
          clearable
          searchable={false}
          placeholder="Chưa ước lượng thời gian"
          placeholderIcon={<Clock size={14} className="text-gray-400" />}
          ariaLabel="Thời lượng dự kiến"
        />
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
