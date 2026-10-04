'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { useCreateTodo } from '../hooks';
import { NodePicker } from './NodePicker';

export function TodoForm({ dateKey }: { dateKey: string }) {
  const [title, setTitle] = useState('');
  const [nodeIds, setNodeIds] = useState<number[]>([]);
  const createTodo = useCreateTodo();

  const submit = () => {
    if (!title.trim()) return;
    createTodo.mutate(
      { title: title.trim(), date: dateKey, nodeIds },
      {
        onSuccess: () => {
          setTitle('');
          setNodeIds([]);
        },
      },
    );
  };

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Việc cần làm…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
        />
        <Button onClick={submit} disabled={!title.trim() || createTodo.isPending}>
          <Plus size={15} /> Thêm
        </Button>
      </div>
      <NodePicker selectedIds={nodeIds} onChange={setNodeIds} />
    </div>
  );
}
