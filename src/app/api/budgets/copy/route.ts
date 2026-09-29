import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody } from '@/lib/api';
import { addMonths, isValidMonthStr } from '@/lib/dates';

const Body = z.object({
  month: z.string().refine(isValidMonthStr, { error: 'Tháng không hợp lệ' }),
});

// Sao chép hạn mức đặt riêng của tháng trước sang tháng này (ghi đè nếu đã có)
export const POST = handle(async (req: Request) => {
  const { month } = await parseBody(req, Body);
  const prev = await prisma.budget.findMany({ where: { month: addMonths(month, -1) } });
  for (const b of prev) {
    await prisma.budget.upsert({
      where: { categoryId_month: { categoryId: b.categoryId, month } },
      update: { amount: b.amount },
      create: { categoryId: b.categoryId, month, amount: b.amount },
    });
  }
  return json({ copied: prev.length });
});
