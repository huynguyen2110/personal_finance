'use client';

import { Network, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Dialog } from '@/modules/mindmap/components/ui/Dialog';
import { Input } from '@/modules/mindmap/components/ui/Input';
import { useDeleteMindmap, useUpdateMindmap } from '../hooks';
import { Mindmap } from '../types';

export function MindmapCard({ mindmap }: { mindmap: Mindmap }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(mindmap.title);
  const update = useUpdateMindmap();
  const remove = useDeleteMindmap();

  const commitRename = () => {
    if (title.trim() && title.trim() !== mindmap.title) {
      update.mutate({ id: mindmap.id, title: title.trim() });
    }
    setRenaming(false);
  };

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/10">
      <Link href={`/mindmap/${mindmap.id}`} className="block">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30 transition-transform duration-200 group-hover:scale-105">
          <Network size={19} />
        </div>
        <p className="font-semibold tracking-tight text-gray-800 transition-colors group-hover:text-violet-700">
          {mindmap.title}
        </p>
        {mindmap.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">
            {mindmap.description}
          </p>
        )}
        <p className="mt-3 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {mindmap.nodeCount ?? 0} node
        </p>
      </Link>

      <div className="absolute right-3 top-3 hidden gap-1 group-hover:flex">
        <button
          onClick={() => setRenaming(true)}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Đổi tên"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => {
            if (confirm(`Xóa mindmap "${mindmap.title}"? Toàn bộ node và trang sẽ mất.`)) {
              remove.mutate(mindmap.id);
            }
          }}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Xóa"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <Dialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Đổi tên mindmap"
      >
        <div className="space-y-4">
          <Input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenaming(false)}>
              Hủy
            </Button>
            <Button onClick={commitRename}>Lưu</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
