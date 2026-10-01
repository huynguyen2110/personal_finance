import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { RuleDTO, RuleInput, RuleTestInput, RuleTestResult } from '../types';

const BASE_URL = '/api/rules';

export const RULE_QUERY_KEYS = { LIST: ['rules'] as const };

export function useRules() {
  return useQuery({
    queryKey: RULE_QUERY_KEYS.LIST,
    queryFn: () => apiClient<RuleDTO[]>({ url: BASE_URL }),
  });
}

export const createRule = (payload: RuleInput) => apiClient<RuleDTO>({ method: 'post', url: BASE_URL, payload });
export const updateRule = (id: number, payload: RuleInput) => apiClient({ method: 'patch', url: `${BASE_URL}/${id}`, payload });
export const deleteRule = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/${id}` });
export const testRule = (payload: RuleTestInput) =>
  apiClient<RuleTestResult>({ method: 'post', url: `${BASE_URL}/test`, payload });

// Áp dụng lại quy tắc cho giao dịch cũ; trả về số giao dịch thay đổi
export const reapplyRules = (includeRuleCategorized: boolean) =>
  apiClient<{ changed: number }>({ method: 'post', url: `${BASE_URL}/reapply`, payload: { includeRuleCategorized } });
