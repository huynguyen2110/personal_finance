export const SESSION_COOKIE = 'session';

// Thời gian sống của session (90 ngày)
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // giây

export const HOME_ROUTE = '/dashboard';

// Các trang công khai (không cần đăng nhập)
export const PUBLIC_ROUTES = ['/login'];

// Các API công khai: cron (tự xác thực bằng secret)
export const PUBLIC_API_PREFIXES = ['/api/cron/'];
