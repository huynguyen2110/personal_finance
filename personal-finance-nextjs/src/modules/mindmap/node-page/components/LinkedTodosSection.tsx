'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { useCreateTodo, useDeleteTodo, useNodeTodos, useUpdateTodo } from '@/modules/mindmap/todos/hooks';
import { cn, toDateKey } from '@/modules/mindmap/lib/utils';

export function LinkedTodosSection({ nodeId }: { nodeId: number }) {
  const { data: todos } = useNodeTodos(nodeId);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return;
    createTodo.mutate(
      { title: title.trim(), date: toDateKey(new Date()), nodeIds: [nodeId] },
      { onSuccess: () => setTitle('') },
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        Todo gắn với nhánh này
      </h3>

      <div className="mb-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Thêm todo cho hôm nay…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-violet-500"
        />
        <Button size="sm" onClick={add} disabled={!title.trim() || createTodo.isPending}>
          <Plus size={14} />
        </Button>
      </div>

      {!todos || todos.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có todo nào.</p>
      ) : (
        <ul className="space-y-1.5">
          {todos.map((todo) => (
            <li key={todo.id} className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={(e) =>
                  updateTodo.mutate({ id: todo.id, completed: e.target.checked })
                }
                className="h-4 w-4 accent-violet-600"
              />
              <span
                className={cn(
                  'flex-1 text-sm',
                  todo.completed && 'text-gray-400 line-through',
                )}
              >
                {todo.title}
              </span>
              <span className="text-xs text-gray-400">{todo.date}</span>
              <button
                onClick={() => deleteTodo.mutate(todo.id)}
                className="rounded p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
