'use client';

import { useState } from 'react';
import { EmptyState } from '@/modules/mindmap/components/ui/EmptyState';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { DateNav } from '@/modules/mindmap/todos/components/DateNav';
import { TodoForm } from '@/modules/mindmap/todos/components/TodoForm';
import { TodoItem } from '@/modules/mindmap/todos/components/TodoItem';
import { useTodos } from '@/modules/mindmap/todos/hooks';
import { toDateKey } from '@/modules/mindmap/lib/utils';

export default function TodosPage() {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const { data: todos, isLoading } = useTodos(dateKey);

  const done = (todos ?? []).filter((t) => t.completed).length;
  const total = todos?.length ?? 0;

  return (
    <div className="page-in mx-auto max-w-2xl space-y-4 p-6 md:p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Todo hàng ngày</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Theo dõi việc cần làm từng ngày
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {done}/{total}
            </span>
          </div>
        )}
      </div>

      <DateNav dateKey={dateKey} onChange={setDateKey} />
      <TodoForm dateKey={dateKey} />

      {isLoading ? (
        <Spinner />
      ) : !todos || todos.length === 0 ? (
        <EmptyState
          title="Chưa có todo cho ngày này"
          description="Thêm việc cần làm và gắn với các nhánh mindmap để theo dõi tiến độ."
        />
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      )}
    </div>
  );
}
