import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  userId: number;
  username: string;
  exp: number; // timestamp hết hạn (giây)
  [key: string]: unknown;
}

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('[auth] SESSION_SECRET chưa được cấu hình (cần >= 32 ký tự) trong .env');
  }
  return new TextEncoder().encode(secret);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(data: string): string {
  return base64url(createHmac('sha256', getKey()).update(data).digest());
}

// Tạo token dạng "<payload>.<signature>" (payload là JSON base64url).
export function signToken(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

// Xác thực token: kiểm tra chữ ký và hạn dùng. Trả về payload hoặc null.
export function verifyToken(
  token: string | undefined | null
): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromBase64url(body).toString()) as SessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
