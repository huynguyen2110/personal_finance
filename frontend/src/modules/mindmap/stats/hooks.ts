'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from './api';

export function useWeeklyStats(start: string) {
  return useQuery({
    queryKey: ['weekly-stats', start],
    queryFn: () => statsApi.weekly(start),
  });
}
