'use client';

import { useParams } from 'next/navigation';
import { PlanView } from '@/modules/mindmap/plan/components/PlanView';

export default function MindmapPlanPage() {
  const params = useParams<{ id: string }>();
  const mindmapId = Number(params.id);
  if (!Number.isFinite(mindmapId)) return null;
  return <PlanView mindmapId={mindmapId} />;
}
