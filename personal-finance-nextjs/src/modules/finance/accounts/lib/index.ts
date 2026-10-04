import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AccountDTO, AccountInput } from '../types';

const BASE_URL = '/api/accounts';

export const ACCOUNT_QUERY_KEYS = { LIST: ['accounts'] as const };

export function useAccounts() {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.LIST,
    queryFn: () => apiClient<AccountDTO[]>({ url: BASE_URL }),
  });
}

export const createAccount = (payload: AccountInput) => apiClient({ method: 'post', url: BASE_URL, payload });
export const updateAccount = (id: number, payload: AccountInput) =>
  apiClient({ method: 'patch', url: `${BASE_URL}/${id}`, payload });
export const deleteAccount = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/${id}` });
