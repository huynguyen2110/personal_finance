'use client';

import { PrimaryMindmapGate } from '@/modules/mindmap/mindmaps/components/PrimaryMindmapGate';
import { PlanView } from '@/modules/mindmap/plan/components/PlanView';

// Trang đầu của module: Kế hoạch
export default function GrowthPlanPage() {
  return (
    <PrimaryMindmapGate>
      {(mindmapId) => <PlanView mindmapId={mindmapId} />}
    </PrimaryMindmapGate>
  );
}
