'use client';

import { Handle, NodeProps, Position } from '@xyflow/react';
import {
  CheckCircle2,
  ChartPie,
  Circle,
  FileText,
  KeyRound,
  Link2,
  Lock,
  Sprout,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useRef, useState } from 'react';
import { formatCompactVND } from '@/lib/money';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn } from '@/modules/mindmap/lib/utils';
import { STATUS_LABELS } from '@/modules/mindmap/mindmaps/types';
import { ACTION_WIDTH, ROOT_WIDTH } from '../layout';
import { OptionBadge } from '../nodeMeta';
import { MindFlowNode } from '../types';

const HANDLES = [
  ['in-l', 'target', Position.Left],
  ['in-r', 'target', Position.Right],
  ['out-l', 'source', Position.Left],
  ['out-r', 'source', Position.Right],
  ['link-in-l', 'target', Position.Left],
  ['link-in-r', 'target', Position.Right],
  ['link-out-l', 'source', Position.Left],
  ['link-out-r', 'source', Position.Right],
] as const;

function Badge({ option, className }: { option: OptionBadge | null; className?: string }) {
  if (!option) return null;
  return (
    <span
      className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none', className)}
      style={{ backgroundColor: `${option.color}1f`, color: option.color }}
    >
      {option.label}
    </span>
  );
}

function MindNodeComponent({ data, selected }: NodeProps<MindFlowNode>) {
  const {
    nodeId,
    kind,
    title,
    color,
    collapsed,
    hasPage,
    status,
    descendants,
    todoDone,
    todoTotal,
    meta,
    blockedBy,
    unlocks,
    editing,
    linkSource,
    side,
  } = data;

  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  // Mỗi lần vào chế độ sửa (hoặc tiêu đề đổi khi đang sửa): nạp lại tiêu đề hiện tại vào ô nhập.
  // Điều chỉnh state ngay khi render thay vì trong effect (tránh render dây chuyền).
  const editKey = editing ? title : null;
  const [prevEditKey, setPrevEditKey] = useState(editKey);
  if (editKey !== prevEditKey) {
    setPrevEditKey(editKey);
    if (editing) setValue(title);
  }
  useEffect(() => {
    if (editing) committedRef.current = false;
  }, [editing, title]);

  // Node mới tạo bị React Flow ẩn (visibility: hidden) tới khi đo xong kích thước → autoFocus lúc mount có thể trượt.
  // Thử focus lại ở vài khung hình kế tiếp cho tới khi ô nhập nhận focus.
  useEffect(() => {
    if (!editing) return;
    let frame = 0;
    let tries = 0;
    const focus = () => {
      const el = inputRef.current;
      if (!el || document.activeElement === el) return;
      el.focus();
      if (document.activeElement !== el && tries++ < 30) frame = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    data.onCommitTitle(nodeId, value.trim() || title);
  };

  const titleEl = editing ? (
    <input
      ref={inputRef}
      value={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          committedRef.current = true;
          data.onCancelEdit();
        }
      }}
      className="nodrag w-full min-w-16 bg-transparent outline-none"
    />
  ) : null;

  const blocked = kind === 'action' && status !== 'done' && blockedBy.length > 0;
  const done = status === 'done';
  const percent = todoTotal > 0 ? Math.round((todoDone / todoTotal) * 100) : 0;

  let card: React.ReactNode;
  if (kind === 'root') {
    card = (
      <div
        className={cn(
          'flex flex-col items-center rounded-2xl bg-white p-3 text-center shadow-[0_8px_30px_rgba(124,58,237,0.12)] transition-shadow',
          selected && 'ring-2 ring-violet-400 ring-offset-2',
        )}
        style={{ width: ROOT_WIDTH }}
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 shadow-sm">
          <Sprout size={22} />
        </div>
        <div className="w-full text-[17px] font-semibold leading-6 tracking-tight text-gray-900">
          {titleEl ?? <span className="block truncate">{title}</span>}
        </div>
        <span className="mt-0.5 text-[11px] font-semibold text-violet-600">
          Bản đồ năng lực &amp; mục tiêu
        </span>
        <span
          className="mt-2.5 flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
          title="Todo đã xong / tổng (mọi nhánh)"
        >
          <ChartPie size={13} className="text-violet-600" />
          Tổng tiến độ: {todoDone}/{todoTotal} việc
        </span>
      </div>
    );
  } else if (kind === 'area') {
    card = (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md',
          selected && 'shadow-md ring-2 ring-violet-400 ring-offset-1',
        )}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="flex-1 whitespace-nowrap text-[15px] font-semibold text-gray-900">
          {titleEl ?? title}
        </span>
        <Badge option={meta.priority} />
      </div>
    );
  } else {
    const StatusIcon = blocked ? Lock : done ? CheckCircle2 : status === 'doing' ? Timer : Circle;
    card = (
      <div
        className={cn(
          'rounded-xl border-l-[3px] p-2.5 transition-shadow',
          blocked ? 'bg-[#f2f3ff] opacity-80 hover:opacity-100' : 'bg-white',
          selected
            ? 'opacity-100 shadow-[0_4px_16px_rgba(124,58,237,0.2)] ring-2 ring-violet-400'
            : 'shadow-sm hover:shadow-md',
        )}
        style={{ width: ACTION_WIDTH, borderLeftColor: color }}
      >
        <div className="flex h-5 items-center gap-1.5">
          <span
            title={blocked ? 'Đang bị chặn' : status ? STATUS_LABELS[status] : 'Chưa đặt trạng thái'}
            className="shrink-0"
          >
            <StatusIcon
              size={15}
              className={cn(
                blocked
                  ? 'text-red-500'
                  : done
                    ? 'text-teal-600'
                    : status === 'doing'
                      ? 'text-violet-600'
                      : 'text-gray-300',
              )}
            />
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              status === 'doing' ? 'font-semibold text-gray-900' : 'text-gray-800',
              done && 'text-gray-500 line-through',
            )}
            title={title}
          >
            {titleEl ?? title}
          </span>
          {todoTotal > 0 ? (
            <span
              className={cn(
                'shrink-0 text-[11px] font-bold tabular-nums',
                todoDone >= todoTotal ? 'text-teal-600' : 'text-violet-600',
              )}
              title="Todo đã xong / tổng"
            >
              {todoDone}/{todoTotal}
            </span>
          ) : (
            <Badge option={meta.priority} />
          )}
        </div>

        <div className="mt-1.5 flex h-5 items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-gray-500">
          <Badge option={meta.difficulty} className="font-semibold" />
          {meta.hours !== null && <span>{meta.hours} giờ</span>}
          {meta.hours !== null && meta.cost !== null && <span className="opacity-40">•</span>}
          {meta.cost !== null && (
            <span>{meta.cost === 0 ? '0 đ' : `${formatCompactVND(meta.cost)}đ`}</span>
          )}
          {blocked ? (
            <span
              className="ml-auto flex min-w-0 items-center gap-0.5 truncate text-[10px] font-semibold text-red-500"
              title={`Cần xong trước: ${blockedBy.join(', ')}`}
            >
              Cần: {blockedBy[0]}
              {blockedBy.length > 1 && ` +${blockedBy.length - 1}`}
            </span>
          ) : unlocks > 0 && !done ? (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] font-bold text-violet-600">
              <KeyRound size={12} /> Mở khóa {unlocks}
            </span>
          ) : null}
        </div>

        {meta.extraChips.length > 0 && (
          <div className="mt-1.5 flex h-4 items-center gap-1 overflow-hidden">
            {meta.extraChips.map((chip) => (
              <span
                key={chip.key}
                className="whitespace-nowrap rounded-full px-1.5 text-[10px] font-medium leading-4"
                style={
                  chip.color
                    ? { backgroundColor: `${chip.color}1f`, color: chip.color }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                }
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {todoTotal > 0 && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-violet-100">
            <div
              className={cn('h-full rounded-full', percent >= 100 ? 'bg-teal-500' : 'bg-violet-500')}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('group relative', linkSource && 'rounded-xl ring-2 ring-orange-400 ring-offset-2')}>
      {card}

      {/* Thao tác nhanh nổi phía trên thẻ khi rê chuột (không làm đổi kích thước thẻ) */}
      {!editing && (
        <div className="nodrag absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-lg bg-white p-0.5 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          <Link
            href={growthRoutes.node(nodeId)}
            onClick={(e) => e.stopPropagation()}
            title="Mở trang ghi chú"
            className={cn(
              'rounded p-0.5 hover:bg-gray-100',
              hasPage ? 'text-violet-600' : 'text-gray-400',
            )}
          >
            <FileText size={12} />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onStartLink(nodeId);
            }}
            title="Nối với nhánh khác (phím L)"
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-orange-500"
          >
            <Link2 size={12} />
          </button>
        </div>
      )}

      {descendants > 0 && !editing && kind !== 'root' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse(nodeId, !collapsed);
          }}
          title={collapsed ? `Mở rộng (${descendants} node)` : 'Thu gọn nhánh'}
          className={cn(
            'nodrag absolute top-1/2 z-10 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full border bg-white px-0.5 text-[10px] font-bold shadow-sm transition-opacity',
            collapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          style={{
            ...(side === 'left' ? { left: -12 } : { right: -12 }),
            borderColor: color,
            color,
          }}
        >
          {collapsed ? descendants : '−'}
        </button>
      )}

      {/* Điểm nối cạnh cây (in/out) và cạnh liên kết (link-*) ở cả hai phía; cạnh chọn phía theo bố cục */}
      {HANDLES.map(([id, type, position]) => (
        <Handle
          key={id}
          id={id}
          type={type}
          position={position}
          className="mind-handle"
          isConnectable={false}
        />
      ))}
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
