'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { useUpdateNode } from '@/modules/mindmap/mindmaps/hooks';

export function NodePageHeader({
  mindmapId,
  nodeId,
  title,
}: {
  mindmapId: number;
  nodeId: number;
  title: string;
}) {
  const updateNode = useUpdateNode(mindmapId);
  const [value, setValue] = useState(title);

  // Tiêu đề đổi từ server (VD sửa trên canvas) → cập nhật ô nhập, điều chỉnh ngay khi render
  const [prevTitle, setPrevTitle] = useState(title);
  if (title !== prevTitle) {
    setPrevTitle(title);
    setValue(title);
  }

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      updateNode.mutate({ nodeId, title: trimmed });
    } else {
      setValue(title);
    }
  };

  return (
    <div className="space-y-3">
      <Link
        href={growthRoutes.map}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600"
      >
        <ArrowLeft size={15} />
        Về sơ đồ
      </Link>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-gray-300"
        placeholder="Tiêu đề node"
      />
    </div>
  );
}
