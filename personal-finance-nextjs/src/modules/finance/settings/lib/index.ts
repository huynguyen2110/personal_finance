import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DEFAULT_MONTH_START_DAY } from '@/lib/dates';
import type { AppSettings, SettingsInput } from '../types';

const BASE_URL = '/api/settings';

export const SETTINGS_QUERY_KEYS = { GET: ['settings'] as const };

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.GET,
    queryFn: () => apiClient<AppSettings>({ url: BASE_URL }),
    staleTime: 5 * 60_000,
  });
}

// Ngày bắt đầu tháng tài chính; trả 1 (tháng lịch) trong lúc chưa tải xong cài đặt
export function useMonthStartDay(): number {
  return useSettings().data?.monthStartDay ?? DEFAULT_MONTH_START_DAY;
}

export const updateSettings = (payload: SettingsInput) => apiClient<AppSettings>({ method: 'put', url: BASE_URL, payload });
