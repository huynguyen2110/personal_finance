import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BudgetItemInput, BudgetPageData } from '../types';

const BASE_URL = '/api/budgets';

export const BUDGET_QUERY_KEYS = { PAGE: (month: string) => ['budgets', month] as const };

export function useBudgetPage(month: string) {
  return useQuery({
    queryKey: BUDGET_QUERY_KEYS.PAGE(month),
    queryFn: () => apiClient<BudgetPageData>({ url: BASE_URL, params: { month } }),
    placeholderData: keepPreviousData,
  });
}

// Lưu một hoặc nhiều hạn mức trong một lần gọi (amount null = xóa)
export const saveBudgets = (items: BudgetItemInput[]) =>
  apiClient<{ ok: boolean; saved: number }>({ method: 'put', url: BASE_URL, payload: { items } });

// Chép hạn mức riêng của tháng trước sang tháng này
export const copyBudgetsFromPrevMonth = (month: string) =>
  apiClient<{ copied: number }>({ method: 'post', url: `${BASE_URL}/copy`, payload: { month } });
