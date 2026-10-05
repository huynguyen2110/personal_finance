'use client';

import { Clock, Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useUpdateTodo } from '../hooks';

/** Nhập nhanh số phút đã bỏ ra + chấm hiệu quả 1–5 cho một todo. */
export function TodoEffort({
  todo,
  className,
}: {
  todo: Todo;
  className?: string;
}) {
  const updateTodo = useUpdateTodo();
  const [minutes, setMinutes] = useState(
    todo.durationMinutes === null ? '' : String(todo.durationMinutes),
  );
  // Đồng bộ lại khi dữ liệu từ server đổi (VD sửa ở trang khác)
  const serverMinutes =
    todo.durationMinutes === null ? '' : String(todo.durationMinutes);
  const [prevServer, setPrevServer] = useState(serverMinutes);
  if (serverMinutes !== prevServer) {
    setPrevServer(serverMinutes);
    setMinutes(serverMinutes);
  }

  const commitMinutes = () => {
    const parsed =
      minutes.trim() === ''
        ? null
        : Math.min(1440, Math.max(0, Math.round(Number(minutes))));
    if (parsed !== null && Number.isNaN(parsed)) return;
    if (parsed === todo.durationMinutes) return;
    updateTodo.mutate({ id: todo.id, durationMinutes: parsed });
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label
        className="flex items-center gap-1 text-xs text-gray-500"
        title="Số phút đã bỏ ra"
      >
        <Clock size={12} />
        <input
          type="number"
          min={0}
          max={1440}
          value={minutes}
          placeholder="—"
          onChange={(e) => setMinutes(e.target.value)}
          onBlur={commitMinutes}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-12 rounded border border-gray-200 px-1 py-0.5 text-right text-xs outline-none focus:border-violet-400"
        />
        phút
      </label>
      <div className="flex items-center" title="Mức hiệu quả (bấm lại để xóa)">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() =>
              updateTodo.mutate({
                id: todo.id,
                effectiveness: todo.effectiveness === n ? null : n,
              })
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
      </div>
    </div>
  );
}
