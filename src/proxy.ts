import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import {
  SESSION_COOKIE,
  PUBLIC_ROUTES,
  PUBLIC_API_PREFIXES,
  HOME_ROUTE,
} from '@/lib/auth/constants';

// Kiểm tra "lạc quan": chỉ đọc & xác thực cookie, không truy vấn DB.
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ─── API ───
  if (path.startsWith('/api/')) {
    if (PUBLIC_API_PREFIXES.some((p) => path.startsWith(p))) return NextResponse.next();
    const session = verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ─── Trang ───
  const session = verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_ROUTES.includes(path);

  if (!session) {
    if (isPublic) return NextResponse.next();
    const url = new URL('/login', req.nextUrl);
    if (path !== '/') url.searchParams.set('from', path);
    return NextResponse.redirect(url);
  }

  if (isPublic || path === '/') {
    return NextResponse.redirect(new URL(HOME_ROUTE, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Chạy trên mọi route (kể cả /api), trừ static, ảnh, favicon và file có đuôi mở rộng.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
