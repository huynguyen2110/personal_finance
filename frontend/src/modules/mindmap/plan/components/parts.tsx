'use client';

import { Check, ListPlus } from 'lucide-react';
import { useState } from 'react';
import { cn, toDateKey } from '@/modules/mindmap/lib/utils';
import { useUpdateNode } from '@/modules/mindmap/mindmaps/hooks';
import { NodeStatus, STATUS_LABELS } from '@/modules/mindmap/mindmaps/types';
import { useCreateTodo } from '@/modules/mindmap/todos/hooks';
import { Dot, GSelect } from '@/modules/mindmap/components/ui/GSelect';
import { OptionRef } from '../api';

export function OptionBadge({
  option,
  muted,
  title,
}: {
  option: OptionRef | null;
  muted?: boolean;
  title?: string;
}) {
  if (!option) return <span className="text-xs text-gray-300">—</span>;
  return (
    <span
      title={title}
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
        muted && 'opacity-60',
      )}
      style={{ backgroundColor: `${option.color}1a`, color: option.color }}
    >
      {option.label}
    </span>
  );
}

const STATUS_COLORS: Record<NodeStatus | 'none', string> = {
  none: '#d1d5db',
  todo: '#9ca3af',
  doing: '#f59e0b',
  done: '#16a34a',
};
const STATUS_OPTIONS = (['none', 'todo', 'doing', 'done'] as const).map((s) => ({
  value: s,
  label: s === 'none' ? 'Chưa đặt' : STATUS_LABELS[s],
  icon: <Dot color={STATUS_COLORS[s]} />,
}));

/** Ô chọn trạng thái gọn (pill màu theo trạng thái) — đổi ngay trên trang Kế hoạch. */
export function StatusSelect({
  mindmapId,
  nodeId,
  status,
}: {
  mindmapId: number;
  nodeId: number;
  status: NodeStatus | null;
}) {
  const updateNode = useUpdateNode(mindmapId);
  return (
    <GSelect
      size="sm"
      pill
      soft={false}
      options={STATUS_OPTIONS}
      value={status ?? 'none'}
      onChange={(v) => updateNode.mutate({ nodeId, status: v === 'none' || v === null ? null : v })}
      searchable={false}
      ariaLabel="Trạng thái"
      className={`tsel-st-${status ?? 'none'}`}
    />
  );
}

/** Tạo todo hôm nay gắn với hành động. */
export function AddTodoButton({
  nodeId,
  title,
  compact,
}: {
  nodeId: number;
  title: string;
  compact?: boolean;
}) {
  const createTodo = useCreateTodo();
  const [added, setAdded] = useState(false);
  return (
    <button
      disabled={createTodo.isPending || added}
      onClick={() =>
        createTodo.mutate(
          { title, date: toDateKey(new Date()), nodeIds: [nodeId] },
          { onSuccess: () => setAdded(true) },
        )
      }
      title="Thêm vào todo hôm nay"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg text-xs font-medium transition',
        compact ? 'p-1' : 'px-2 py-1',
        added
          ? 'text-green-600'
          : 'text-violet-600 hover:bg-violet-50 disabled:opacity-50',
      )}
    >
      {added ? <Check size={13} /> : <ListPlus size={13} />}
      {!compact && (added ? 'Đã thêm' : 'Todo hôm nay')}
    </button>
  );
}
