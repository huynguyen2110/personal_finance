import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE } from './constants';
import { signToken, verifyToken, type SessionPayload } from './token';

export type { SessionPayload } from './token';

export async function createSession(data: { userId: number; username: string }): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = signToken({ userId: data.userId, username: data.username, exp });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(SESSION_COOKIE)?.value);
}
