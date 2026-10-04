import { apiClient, errorMessage } from '@/lib/api-client';

// Gọi API module Mindmap (/api/mindmap/*) qua apiClient chung: dùng chung token, tự refresh, bóc envelope.
// Giữ dạng api.get/post/... để các feature mindmap không phải đổi cách gọi.
const BASE = '/api/mindmap';

export const api = {
  get: <T>(url: string, config?: { params?: Record<string, unknown> }) => apiClient<T>({ url: BASE + url, params: config?.params }),
  post: <T>(url: string, body?: unknown) => apiClient<T>({ method: 'post', url: BASE + url, payload: body }),
  patch: <T>(url: string, body?: unknown) => apiClient<T>({ method: 'patch', url: BASE + url, payload: body }),
  put: <T>(url: string, body?: unknown) => apiClient<T>({ method: 'put', url: BASE + url, payload: body }),
  delete: <T>(url: string) => apiClient<T>({ method: 'delete', url: BASE + url }),
};

export function extractErrorMessage(error: unknown): string {
  return errorMessage(error, 'Đã có lỗi xảy ra');
}
