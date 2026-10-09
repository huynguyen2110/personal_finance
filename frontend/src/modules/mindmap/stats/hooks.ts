'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from './api';

export function useRangeStats(from: string, to: string) {
  return useQuery({
    queryKey: ['range-stats', from, to],
    queryFn: () => statsApi.range(from, to),
  });
}
