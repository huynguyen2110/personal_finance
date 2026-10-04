'use client';

import { Handle, NodeProps, Position } from '@xyflow/react';
import { CheckCircle2, Circle, CircleDot, FileText, Link2 } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/modules/mindmap/lib/utils';
import { STATUS_LABELS } from '@/modules/mindmap/mindmaps/types';
import { MindFlowNode } from '../types';

function MindNodeComponent({ data, selected }: NodeProps<MindFlowNode>) {
  const {
    nodeId,
    mindmapId,
    title,
    color,
    isRoot,
    collapsed,
    hasPage,
    status,
    descendants,
    todoDone,
    todoTotal,
    editing,
    chips,
    linkSource,
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

  const done = todoTotal > 0 && todoDone >= todoTotal;

  return (
    <div className="group relative">
      <Handle
        type="target"
        position={Position.Left}
        className="mind-handle"
        isConnectable={false}
      />
      <div
        className={cn(
          'flex flex-col border-2 bg-white shadow-sm shadow-gray-950/5 transition-shadow hover:shadow-md hover:shadow-gray-950/10',
          isRoot ? 'px-5 py-2.5' : 'px-4 py-1.5',
          isRoot || chips.length > 0 ? 'rounded-xl' : 'rounded-full',
          selected && 'shadow-md ring-2 ring-violet-300 ring-offset-1',
          linkSource && 'shadow-md ring-2 ring-orange-400 ring-offset-2',
          status === 'done' && !selected && 'opacity-60',
        )}
        style={{ borderColor: color }}
      >
        <div
          className={cn(
            'flex items-center gap-1.5',
            isRoot ? 'text-base font-semibold' : 'text-sm',
          )}
        >
        {status && !editing && (
          <span title={STATUS_LABELS[status]} className="shrink-0">
            {status === 'done' ? (
              <CheckCircle2 size={14} className="text-green-600" />
            ) : status === 'doing' ? (
              <CircleDot size={14} className="text-amber-500" />
            ) : (
              <Circle size={14} className="text-gray-300" />
            )}
          </span>
        )}
        {editing ? (
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
            style={{ width: `${Math.max(value.length, 4)}ch` }}
          />
        ) : (
          <span
            className={cn(
              'whitespace-nowrap',
              status === 'done' && 'text-gray-500 line-through',
            )}
          >
            {title}
          </span>
        )}

        {todoTotal > 0 && !editing && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
            )}
            title="Todo đã hoàn thành / tổng"
          >
            <CheckCircle2 size={10} />
            {todoDone}/{todoTotal}
          </span>
        )}

        {!editing && (
          <Link
            href={`/mindmap/${mindmapId}/nodes/${nodeId}`}
            onClick={(e) => e.stopPropagation()}
            title="Mở trang chi tiết"
            className={cn(
              'nodrag rounded p-0.5 transition-opacity hover:bg-gray-100',
              hasPage
                ? 'text-violet-500 opacity-100'
                : 'text-gray-400 opacity-0 group-hover:opacity-100',
            )}
          >
            <FileText size={13} />
          </Link>
        )}

        {!editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onStartLink(nodeId);
            }}
            title="Nối với nhánh khác (phím L)"
            className="nodrag rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-orange-500 group-hover:opacity-100"
          >
            <Link2 size={13} />
          </button>
        )}
        </div>

        {chips.length > 0 && !editing && (
          <div className="mt-1 flex items-center gap-1 overflow-hidden">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="whitespace-nowrap rounded-full px-1.5 py-px text-[10px] font-medium"
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
      </div>

      {descendants > 0 && !editing && (
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
          style={{ right: -12, borderColor: color, color }}
        >
          {collapsed ? descendants : '−'}
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="mind-handle"
        isConnectable={false}
      />
      {/* Điểm neo cho cạnh liên kết ngang (không dùng để kéo nối) */}
      <Handle
        id="link-out"
        type="source"
        position={Position.Bottom}
        className="mind-handle"
        isConnectable={false}
      />
      <Handle
        id="link-in"
        type="target"
        position={Position.Top}
        className="mind-handle"
        isConnectable={false}
      />
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
