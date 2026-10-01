import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody, HttpError } from '@/lib/api';
import { DEFAULT_BUDGET_MONTH, getBudgetPage } from '@/lib/budget';
import { currentMonthVN, isValidMonthStr } from '@/lib/dates';

export const GET = handle(async (req: NextRequest) => {
  const month = req.nextUrl.searchParams.get('month') ?? currentMonthVN();
  if (!isValidMonthStr(month)) throw new HttpError(400, 'Tháng không hợp lệ');
  return json(await getBudgetPage(month));
});

const Item = z.object({
  categoryId: z.number().int().positive(),
  // "YYYY-MM" = chỉ tháng đó; "*" = mặc định mọi tháng
  month: z.string().refine((m) => m === DEFAULT_BUDGET_MONTH || isValidMonthStr(m), {
    error: 'Tháng không hợp lệ',
  }),
  // null = xóa hạn mức
  amount: z.number().int().min(0).max(1e13).nullable(),
});

// Một hạn mức, hoặc nhiều hạn mức cùng lúc ({ items: [...] }) — lưu trong một transaction
const PutBody = z.union([Item, z.object({ items: z.array(Item).min(1).max(200) })]);

export const PUT = handle(async (req: Request) => {
  const body = await parseBody(req, PutBody);
  const items = 'items' in body ? body.items : [body];

  const ids = [...new Set(items.map((i) => i.categoryId))];
  const cats = await prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true } });
  if (cats.length !== ids.length) throw new HttpError(400, 'Danh mục không tồn tại');
  if (cats.some((c) => c.kind !== 'EXPENSE')) throw new HttpError(400, 'Chỉ đặt ngân sách cho danh mục chi');

  await prisma.$transaction(
    items.map(({ categoryId, month, amount }) =>
      amount === null
        ? prisma.budget.deleteMany({ where: { categoryId, month } })
        : prisma.budget.upsert({
            where: { categoryId_month: { categoryId, month } },
            update: { amount: BigInt(amount) },
            create: { categoryId, month, amount: BigInt(amount) },
          })
    )
  );
  return json({ ok: true, saved: items.length });
});
