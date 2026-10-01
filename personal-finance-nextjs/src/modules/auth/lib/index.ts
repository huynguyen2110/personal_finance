import { apiClient } from '@/lib/api-client';
import { clearTokens, getRefreshToken, saveTokens, type AuthTokens } from '@/lib/auth-storage';

export async function login(username: string, password: string): Promise<AuthTokens> {
  const tokens = await apiClient<AuthTokens>({
    method: 'post',
    url: '/api/auth/login',
    payload: { username, password },
    requireAuth: false,
  });
  saveTokens(tokens);
  return tokens;
}

// Thu hồi refresh token ở server (lỗi mạng cũng không sao), xóa token và về trang đăng nhập
export async function logout(): Promise<void> {
  const refresh_token = getRefreshToken();
  if (refresh_token) {
    await apiClient({ method: 'post', url: '/api/auth/logout', payload: { refresh_token }, requireAuth: false }).catch(() => {});
  }
  clearTokens();
  window.location.href = '/login';
}
