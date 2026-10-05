// Lưu token đăng nhập ở localStorage (giống e-learning). Chỉ dùng ở client.
const ACCESS_KEY = 'pf_access_token';
const REFRESH_KEY = 'pf_refresh_token';
const USER_KEY = 'pf_user';

export interface StoredUser {
  id: number;
  username: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: StoredUser;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return typeof window === 'undefined' ? fallback : fn();
  } catch {
    return fallback;
  }
}

export const getAccessToken = () => safe(() => localStorage.getItem(ACCESS_KEY), null);
export const getRefreshToken = () => safe(() => localStorage.getItem(REFRESH_KEY), null);
export const getStoredUser = () =>
  safe<StoredUser | null>(() => JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'), null);

export function saveTokens(t: AuthTokens) {
  safe(() => {
    localStorage.setItem(ACCESS_KEY, t.access_token);
    localStorage.setItem(REFRESH_KEY, t.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(t.user));
  }, undefined);
}

export function clearTokens() {
  safe(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, undefined);
}

// Thời điểm hết hạn (ms) đọc từ payload JWT; không đọc được thì coi như đã hết hạn
export function tokenExpiresAt(token: string | null): number {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// Có phiên đăng nhập (còn access token hợp lệ hoặc còn refresh token để lấy lại)
export function hasSession(): boolean {
  return !!getRefreshToken() || tokenExpiresAt(getAccessToken()) > Date.now();
}
