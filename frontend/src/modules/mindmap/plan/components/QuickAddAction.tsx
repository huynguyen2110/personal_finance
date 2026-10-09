'use client';

import { useQueryClient } from '@tanstack/react-query';
import { CirclePlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn } from '@/modules/mindmap/lib/utils';
import { useCreateNode } from '@/modules/mindmap/mindmaps/hooks';
import { PlanArea } from '../api';

/** Thêm nhanh một hành động (nhánh con) vào lĩnh vực đã chọn mà không cần mở sơ đồ. */
export function QuickAddAction({
  mindmapId,
  areas,
  defaultAreaId,
  colorOf,
}: {
  mindmapId: number;
  areas: PlanArea[];
  defaultAreaId: number | null;
  colorOf: (areaId: number) => string;
}) {
  const qc = useQueryClient();
  const createNode = useCreateNode(mindmapId);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [added, setAdded] = useState<{ id: number; title: string } | null>(null);
  // Lĩnh vực: chọn tay > lĩnh vực đang lọc > lĩnh vực đầu tiên
  const areaId = picked ?? defaultAreaId ?? areas[0]?.nodeId ?? null;

  const submit = () => {
    if (!title.trim() || areaId === null) return;
    createNode.mutate(
      { parentId: areaId, title: title.trim() },
      {
        onSuccess: (node) => {
          setAdded({ id: node.id, title: node.title });
          setTitle('');
          qc.invalidateQueries({ queryKey: ['plan', mindmapId] });
        },
      },
    );
  };

  if (areas.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <CirclePlus size={20} className="ml-2 shrink-0 text-gray-500" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Thêm nhanh hành động vào kế hoạch (VD: Luyện đề IELTS Listening Test 1)…"
          className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim() || createNode.isPending}
          className="shrink-0 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-50"
        >
          Thêm việc
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1 px-2 pb-1 text-[11px] font-semibold">
        <span className="text-gray-500">Vào lĩnh vực:</span>
        {areas.map((a) => (
          <button
            key={a.nodeId}
            type="button"
            onClick={() => setPicked(a.nodeId)}
            className={cn(
              'rounded-full px-2 py-0.5 transition',
              areaId === a.nodeId ? 'text-white shadow-sm' : 'bg-[#f2f3ff] text-gray-600 hover:bg-[#eaedff]',
            )}
            style={areaId === a.nodeId ? { backgroundColor: colorOf(a.nodeId) } : undefined}
          >
            {a.title}
          </button>
        ))}
        {added && (
          <span className="ml-auto text-teal-700">
            Đã thêm “{added.title}” —{' '}
            <Link href={growthRoutes.node(added.id)} className="underline">
              gán ưu tiên, độ khó…
            </Link>
          </span>
        )}
      </div>
      {createNode.isError && (
        <p className="px-2 pb-1 text-xs text-red-600">{extractErrorMessage(createNode.error)}</p>
      )}
    </div>
  );
}
