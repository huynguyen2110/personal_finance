'use client';

import { useParams } from 'next/navigation';
import { MindmapCanvas } from '@/modules/mindmap/canvas/components/MindmapCanvas';

export default function MindmapCanvasPage() {
  const params = useParams<{ id: string }>();
  const mindmapId = Number(params.id);
  if (!Number.isFinite(mindmapId)) return null;
  return (
    // Canvas chiếm hết phần dưới header của khung module
    <div className="h-[calc(100dvh-var(--core-header-height))]">
      <MindmapCanvas mindmapId={mindmapId} />
    </div>
  );
}
