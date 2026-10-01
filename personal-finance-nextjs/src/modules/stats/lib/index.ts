import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import type { DashboardData, ReportData } from '../types';

export interface DashboardParams {
  from: string;
  to: string;
  accountId?: number | null;
}

export interface ReportParams {
  fromMonth: string;
  toMonth: string;
  accountId?: number | null;
}

export const STATS_QUERY_KEYS = {
  DASHBOARD: (p: DashboardParams) => ['stats', 'dashboard', p] as const,
  REPORT: (p: ReportParams) => ['stats', 'report', p] as const,
};

export function useDashboard(params: DashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.DASHBOARD(params),
    queryFn: () => apiClient<DashboardData>({ url: '/api/stats/dashboard', params: { ...params } }),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useReport(params: ReportParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.REPORT(params),
    queryFn: () => apiClient<ReportData>({ url: '/api/stats/report', params: { ...params } }),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export const exportReport = (params: ReportParams) =>
  downloadFile('/api/stats/report/export', { ...params }, 'thong-ke.xlsx');
