'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, deleteSession } from '@/lib/auth/session';
import { HOME_ROUTE } from '@/lib/auth/constants';

const LoginSchema = z.object({
  username: z.string().trim().min(1, { error: 'Vui lòng nhập tên đăng nhập' }),
  password: z.string().min(1, { error: 'Vui lòng nhập mật khẩu' }),
  from: z.string().optional(),
});

export interface LoginState {
  error?: string;
}

// Chỉ cho phép chuyển hướng nội bộ
function safeRedirect(from: string | undefined): string {
  return from && from.startsWith('/') && !from.startsWith('//') ? from : HOME_ROUTE;
}

export async function login(
  _prev: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    from: formData.get('from') ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
  }

  const { username, password, from } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });

  // Thông báo chung để tránh lộ thông tin tài khoản nào tồn tại.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Tên đăng nhập hoặc mật khẩu không đúng' };
  }

  await createSession({ userId: user.id, username: user.username });
  redirect(safeRedirect(from));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
