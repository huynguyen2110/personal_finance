import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import type { Paged } from '@/types/common';
import type { BulkUpdateInput, SelfTransferAccount, TransactionDTO, TransactionFilters, TransactionInput } from '../types';

const BASE_URL = '/api/transactions';

export const TRANSACTION_QUERY_KEYS = {
  LIST: (params: Record<string, unknown>) => ['transactions', params] as const,
};

// Danh sách theo bộ lọc + trang; giữ dữ liệu cũ khi đổi trang/bộ lọc (không nháy trắng)
export function useTransactions(params: TransactionFilters & { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: TRANSACTION_QUERY_KEYS.LIST(params),
    queryFn: () => apiClient<Paged<TransactionDTO>>({ url: BASE_URL, params }),
    placeholderData: keepPreviousData,
  });
}

export const createTransaction = (payload: TransactionInput) =>
  apiClient<TransactionDTO>({ method: 'post', url: BASE_URL, payload });
export const updateTransaction = (id: number, payload: TransactionInput) =>
  apiClient<TransactionDTO>({ method: 'patch', url: `${BASE_URL}/${id}`, payload });
export const deleteTransaction = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/${id}` });
export const bulkUpdateTransactions = (payload: BulkUpdateInput) =>
  apiClient<{ updated: number; skipped: number }>({ method: 'patch', url: `${BASE_URL}/bulk`, payload });

// "Không phải chuyển nội bộ": gỡ cặp chuyển khoản
export const unpairTransaction = (id: number) =>
  apiClient<TransactionDTO>({ method: 'post', url: `${BASE_URL}/${id}/unpair` });

// Các tài khoản của chính mình đã nhận tiền chuyển đi, kèm có đang "luôn tính chi tiêu" không
export function useSelfTransferAccounts() {
  return useQuery({
    queryKey: ['transactions', 'self-transfer-accounts'] as const,
    queryFn: () => apiClient<SelfTransferAccount[]>({ url: `${BASE_URL}/self-transfer-accounts` }),
  });
}

// Luôn tính chi tiêu cho các lần chuyển sang một tài khoản của chính mình (áp cả cho giao dịch cũ)
export const setAlwaysSpend = (payload: { accountNumber: string; enabled: boolean; name?: string | null; bank?: string | null }) =>
  apiClient<{ updated: number }>({ method: 'post', url: `${BASE_URL}/always-spend`, payload });

export const exportTransactions = (filters: TransactionFilters) =>
  downloadFile(`${BASE_URL}/export`, filters, 'giao-dich.xlsx');

// Chuyển khoản nội bộ: số cặp đang có + quét lại
export const TRANSFER_QUERY_KEYS = { STATUS: ['transfers', 'status'] as const };

export function useTransferStatus() {
  return useQuery({
    queryKey: TRANSFER_QUERY_KEYS.STATUS,
    queryFn: () => apiClient<{ pairs: number; windowMinutes: number }>({ url: '/api/transfers/scan' }),
  });
}

export const scanTransfers = () =>
  apiClient<{ paired: number; pairs: number }>({ method: 'post', url: '/api/transfers/scan' });
