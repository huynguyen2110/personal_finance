import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EmailImportResult, EmailPollSummary, EmailStatus } from '../types';

export const EMAIL_QUERY_KEYS = { STATUS: ['email', 'status'] as const };

export function useEmailStatus() {
  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.STATUS,
    queryFn: () => apiClient<EmailStatus>({ url: '/api/email/status' }),
  });
}

// Đọc hộp thư ngay (sinceDays: đọc lại N ngày gần nhất)
export const pollEmails = (sinceDays?: number) =>
  apiClient<EmailPollSummary>({ method: 'post', url: '/api/email/poll', payload: sinceDays ? { sinceDays } : {} });

// Dán nội dung một email: dryRun = chỉ đọc thử, không lưu
export const importEmail = (content: string, dryRun: boolean) =>
  apiClient<EmailImportResult>({ method: 'post', url: '/api/email/import', payload: { content, dryRun } });
