import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody, HttpError } from '@/lib/api';

const Body = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(1000),
  categoryId: z.number().int().positive().nullable().optional(),
  excludeFromStats: z.boolean().optional(),
});

// Gán danh mục / cờ loại khỏi thống kê cho nhiều giao dịch.
// Danh mục chỉ áp cho giao dịch cùng chiều với loại danh mục; số còn lại bị bỏ qua.
export const PATCH = handle(async (req: Request) => {
  const body = await parseBody(req, Body);
  let updated = 0;
  let skipped = 0;

  if (body.categoryId !== undefined) {
    if (body.categoryId === null) {
      const r = await prisma.transaction.updateMany({
        where: { id: { in: body.ids } },
        data: { categoryId: null, categorizedBy: 'NONE' },
      });
      updated = r.count;
    } else {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!cat) throw new HttpError(400, 'Danh mục không tồn tại');
      const r = await prisma.transaction.updateMany({
        where: { id: { in: body.ids }, direction: cat.kind === 'INCOME' ? 'IN' : 'OUT' },
        data: { categoryId: cat.id, categorizedBy: 'MANUAL' },
      });
      updated = r.count;
      skipped = body.ids.length - r.count;
    }
  }

  if (body.excludeFromStats !== undefined) {
    const r = await prisma.transaction.updateMany({
      where: { id: { in: body.ids } },
      data: { excludeFromStats: body.excludeFromStats },
    });
    updated = Math.max(updated, r.count);
  }

  return json({ updated, skipped });
});
