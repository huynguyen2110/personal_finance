'use client';

import { MindmapCanvas } from '@/modules/mindmap/canvas/components/MindmapCanvas';
import { PrimaryMindmapGate } from '@/modules/mindmap/mindmaps/components/PrimaryMindmapGate';

export default function GrowthMapPage() {
  return (
    // Canvas chiếm hết phần dưới header của khung module
    <div className="h-[calc(100dvh-var(--core-header-height))]">
      <PrimaryMindmapGate className="h-full">
        {(mindmapId) => <MindmapCanvas mindmapId={mindmapId} />}
      </PrimaryMindmapGate>
    </div>
  );
}
