import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EmailBeforeStart, EmailImportResult, EmailPollSummary, EmailStatus } from '../types';

export const EMAIL_QUERY_KEYS = {
  STATUS: ['email', 'status'] as const,
  BEFORE_START: ['email', 'before-start'] as const,
};

export function useEmailStatus() {
  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.STATUS,
    queryFn: () => apiClient<EmailStatus>({ url: '/api/email/status' }),
  });
}

// Đọc hộp thư ngay (sinceDays: đọc lại N ngày gần nhất)
export const pollEmails = (sinceDays?: number) =>
  apiClient<EmailPollSummary>({ method: 'post', url: '/api/email/poll', payload: sinceDays ? { sinceDays } : {} });

// Đọc lại toàn bộ thư kể từ "ngày bắt đầu lấy dữ liệu" trong cài đặt (trùng lặp tự loại)
export const pollEmailsFromStart = () => apiClient<EmailPollSummary>({ method: 'post', url: '/api/email/poll', payload: { fromStart: true } });

// Giao dịch email có ngày trước ngày bắt đầu
export function useEmailBeforeStart(enabled = true) {
  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.BEFORE_START,
    queryFn: () => apiClient<EmailBeforeStart>({ url: '/api/email/before-start' }),
    enabled,
  });
}

export const purgeEmailBeforeStart = () => apiClient<{ startDate: string; deleted: number }>({ method: 'post', url: '/api/email/purge-before-start' });

// Dán nội dung một email: dryRun = chỉ đọc thử, không lưu
export const importEmail = (content: string, dryRun: boolean) =>
  apiClient<EmailImportResult>({ method: 'post', url: '/api/email/import', payload: { content, dryRun } });
