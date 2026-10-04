'use client';

import { useQuery } from '@tanstack/react-query';
import { planApi } from './api';

export function usePlan(mindmapId: number) {
  return useQuery({
    queryKey: ['plan', mindmapId],
    queryFn: () => planApi.get(mindmapId),
    enabled: Number.isFinite(mindmapId),
  });
}
