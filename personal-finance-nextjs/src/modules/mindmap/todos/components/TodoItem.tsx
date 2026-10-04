'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useDeleteTodo, useUpdateTodo } from '../hooks';
import { TodoEffort } from './TodoEffort';

export function TodoItem({ todo }: { todo: Todo }) {
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  return (
    <li className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-violet-200 hover:shadow">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) =>
          updateTodo.mutate({ id: todo.id, completed: e.target.checked })
        }
        className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-violet-600"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm transition-colors',
            todo.completed && 'text-gray-400 line-through',
          )}
        >
          {todo.title}
        </p>
        {todo.nodes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {todo.nodes.map((n) => (
              <Link
                key={n.id}
                href={`/mindmap/${n.mindmapId}/nodes/${n.id}`}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700 hover:bg-violet-100"
                title={n.mindmapTitle}
              >
                {n.title}
              </Link>
            ))}
          </div>
        )}
        <TodoEffort
          todo={todo}
          className={cn(
            'mt-1.5 transition-opacity',
            todo.completed ||
              todo.durationMinutes !== null ||
              todo.effectiveness !== null
              ? 'opacity-100'
              : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100',
          )}
        />
      </div>
      <button
        onClick={() => deleteTodo.mutate(todo.id)}
        className="rounded p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
        title="Xóa todo"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
