import type { AxiosError, Method, ResponseType } from 'axios';
import api from './api';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens, tokenExpiresAt, type AuthTokens } from './auth-storage';

// Lỗi chuẩn hoá từ API: { statusCode, message, error, path, timestamp }
export interface ApiError {
  message: string;
  status: number;
}

export interface ApiClientOptions {
  method?: Method;
  url: string;
  payload?: unknown;
  params?: Record<string, unknown>;
  requireAuth?: boolean;
  responseType?: ResponseType;
}

const REFRESH_BEFORE_MS = 60_000; // refresh trước khi access token hết hạn 60 giây
let refreshing: Promise<string> | null = null;

// Bỏ tham số rỗng để URL gọn (giống qs() cũ)
function cleanParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false),
  );
}

// Lấy access token mới bằng refresh token. Chỉ một lần refresh chạy cùng lúc.
export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh_token = getRefreshToken();
      if (!refresh_token) throw new Error('no refresh token');
      const res = await api.post('/api/auth/refresh-token', { refresh_token });
      const tokens = res.data.data as AuthTokens;
      saveTokens(tokens);
      return tokens.access_token;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

function redirectToLogin() {
  clearTokens();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?from=${from}`;
  }
}

async function validAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && tokenExpiresAt(token) - Date.now() > REFRESH_BEFORE_MS) return token;
  if (!getRefreshToken()) return token;
  try {
    return await refreshAccessToken();
  } catch {
    return token; // để request tự nhận 401 và xử lý bên dưới
  }
}

function toApiError(error: unknown): ApiError {
  const e = error as AxiosError<{ message?: string }>;
  if (e?.response) {
    return { status: e.response.status, message: e.response.data?.message ?? `Lỗi ${e.response.status}` };
  }
  return { status: 0, message: 'Không kết nối được máy chủ API' };
}

// Gọi API: gắn Bearer token, tự refresh, gặp 401 thì refresh rồi thử lại 1 lần; bóc lớp "data" của envelope.
export async function apiRequest<T>(opts: ApiClientOptions): Promise<{ data: T; headers: Record<string, string> }> {
  const { method = 'get', url, payload, params, requireAuth = true, responseType } = opts;
  const send = (token: string | null) =>
    api.request({
      method,
      url,
      data: payload,
      params: cleanParams(params),
      responseType,
      headers: requireAuth && token ? { Authorization: `Bearer ${token}` } : undefined,
    });

  try {
    let res;
    try {
      res = await send(requireAuth ? await validAccessToken() : null);
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      if (!requireAuth || status !== 401) throw error;
      // Access token bị từ chối → refresh và thử lại đúng 1 lần
      let fresh: string;
      try {
        fresh = await refreshAccessToken();
      } catch {
        redirectToLogin();
        throw error;
      }
      res = await send(fresh);
    }
    const body = res.data;
    const data = responseType === 'blob' ? body : body?.data;
    return { data: data as T, headers: res.headers as Record<string, string> };
  } catch (error) {
    if (requireAuth && (error as AxiosError)?.response?.status === 401) redirectToLogin();
    throw toApiError(error);
  }
}

export async function apiClient<T = unknown>(opts: ApiClientOptions): Promise<T> {
  return (await apiRequest<T>(opts)).data;
}

// Thông báo lỗi để hiển thị (toast)
export function errorMessage(e: unknown, fallback = 'Có lỗi xảy ra'): string {
  return (e as ApiError)?.message || fallback;
}
