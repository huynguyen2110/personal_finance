import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z, type ZodType } from 'zod';
import { jsonReplacer } from './money';
import { getSession } from './auth/session';

// NextResponse.json không hỗ trợ BigInt → tự stringify.
export function json(data: unknown, init?: ResponseInit): NextResponse {
  return new NextResponse(JSON.stringify(data, jsonReplacer), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, 'Body không phải JSON hợp lệ');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(
      400,
      issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Dữ liệu không hợp lệ'
    );
  }
  return parsed.data;
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'ID không hợp lệ');
  return id;
}

// Bọc handler: kiểm tra đăng nhập (lớp thứ hai, sau proxy) và trả lỗi JSON thống nhất.
// `public: true` cho route tự xác thực bằng cách khác (VD: cron dùng secret).
export function handle<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
  opts: { public?: boolean } = {}
) {
  return async (...args: A): Promise<Response> => {
    try {
      if (!opts.public && !(await getSession())) {
        return json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') return json({ error: 'Không tìm thấy dữ liệu' }, { status: 404 });
        if (e.code === 'P2002') return json({ error: 'Dữ liệu bị trùng' }, { status: 409 });
      }
      console.error(e);
      return json({ error: e instanceof Error ? e.message : 'Lỗi máy chủ' }, { status: 500 });
    }
  };
}

export const zMoney = z.coerce.number().int().min(0).max(1e13);
