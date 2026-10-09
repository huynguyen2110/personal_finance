'use client';

import { PrimaryMindmapGate } from '@/modules/mindmap/mindmaps/components/PrimaryMindmapGate';
import { StatsView } from '@/modules/mindmap/stats/components/StatsView';

export default function StatsPage() {
  return (
    <PrimaryMindmapGate>
      {(mindmapId) => <StatsView mindmapId={mindmapId} />}
    </PrimaryMindmapGate>
  );
}
