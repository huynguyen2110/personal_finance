import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Direction } from '@/types/common';
import type { ContributionDTO, ContributionInput, GoalInput, GoalsPageData, LinkableTxn } from '../types';

const BASE_URL = '/api/goals';

export const GOAL_QUERY_KEYS = {
  PAGE: ['goals'] as const,
  CONTRIBUTIONS: (goalId: number) => ['goals', goalId, 'contributions'] as const,
  LINKABLE: (direction: Direction) => ['goals', 'linkable', direction] as const,
};

export function useGoalsPage() {
  return useQuery({ queryKey: GOAL_QUERY_KEYS.PAGE, queryFn: () => apiClient<GoalsPageData>({ url: BASE_URL }) });
}

export function useContributions(goalId: number) {
  return useQuery({
    queryKey: GOAL_QUERY_KEYS.CONTRIBUTIONS(goalId),
    queryFn: () => apiClient<ContributionDTO[]>({ url: `${BASE_URL}/${goalId}/contributions` }),
  });
}

// Giao dịch 90 ngày gần nhất chưa gắn với lần nạp/rút nào
export function useLinkableTransactions(direction: Direction, enabled: boolean) {
  return useQuery({
    queryKey: GOAL_QUERY_KEYS.LINKABLE(direction),
    queryFn: () => apiClient<LinkableTxn[]>({ url: `${BASE_URL}/linkable-transactions`, params: { direction } }),
    enabled,
  });
}

export const createGoal = (payload: GoalInput) => apiClient<{ id: number }>({ method: 'post', url: BASE_URL, payload });
export const updateGoal = (id: number, payload: GoalInput) => apiClient({ method: 'patch', url: `${BASE_URL}/${id}`, payload });
export const deleteGoal = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/${id}` });
export const archiveGoal = (id: number, archived: boolean) =>
  apiClient({ method: 'post', url: `${BASE_URL}/${id}/archive`, payload: { archived } });

export const addContribution = (goalId: number, payload: ContributionInput) =>
  apiClient({ method: 'post', url: `${BASE_URL}/${goalId}/contributions`, payload });
export const deleteContribution = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/contributions/${id}` });
