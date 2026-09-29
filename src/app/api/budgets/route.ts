import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody, HttpError } from '@/lib/api';
import { DEFAULT_BUDGET_MONTH, getBudgetStatus } from '@/lib/budget';
import { currentMonthVN, isValidMonthStr } from '@/lib/dates';

export const GET = handle(async (req: NextRequest) => {
  const month = req.nextUrl.searchParams.get('month') ?? currentMonthVN();
  if (!isValidMonthStr(month)) throw new HttpError(400, 'Tháng không hợp lệ');
  return json({ month, lines: await getBudgetStatus(month) });
});

const PutBody = z.object({
  categoryId: z.number().int().positive(),
  // "YYYY-MM" = chỉ tháng đó; "*" = mặc định mọi tháng
  month: z.string().refine((m) => m === DEFAULT_BUDGET_MONTH || isValidMonthStr(m), {
    error: 'Tháng không hợp lệ',
  }),
  // null = xóa hạn mức
  amount: z.number().int().min(0).max(1e13).nullable(),
});

export const PUT = handle(async (req: Request) => {
  const { categoryId, month, amount } = await parseBody(req, PutBody);
  const cat = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  if (cat.kind !== 'EXPENSE') throw new HttpError(400, 'Chỉ đặt ngân sách cho danh mục chi');

  if (amount === null) {
    await prisma.budget.deleteMany({ where: { categoryId, month } });
  } else {
    await prisma.budget.upsert({
      where: { categoryId_month: { categoryId, month } },
      update: { amount: BigInt(amount) },
      create: { categoryId, month, amount: BigInt(amount) },
    });
  }
  return json({ ok: true });
});
