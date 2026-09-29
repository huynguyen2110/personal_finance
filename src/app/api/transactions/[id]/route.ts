import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody, parseId, HttpError } from '@/lib/api';
import { txnSelect } from '@/lib/txnQuery';
import { kindForDirection } from '@/lib/categorize';
import { detectTransferFor, releaseTransfer } from '@/lib/transfers';

const PatchBody = z.object({
  categoryId: z.number().int().positive().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  excludeFromStats: z.boolean().optional(),
  // Các trường dưới chỉ sửa được với giao dịch nhập tay
  amount: z.number().int().positive().max(1e13).optional(),
  content: z.string().trim().min(1).max(500).optional(),
  transactionDate: z.iso.datetime({ offset: true }).optional(),
  direction: z.enum(['IN', 'OUT']).optional(),
  accountId: z.number().int().positive().optional(),
});

const MANUAL_ONLY = ['amount', 'content', 'transactionDate', 'direction', 'accountId'] as const;

export const PATCH = handle(async (req: Request, ctx: RouteContext<'/api/transactions/[id]'>) => {
  const id = parseId((await ctx.params).id);
  const body = await parseBody(req, PatchBody);
  const txn = await prisma.transaction.findUniqueOrThrow({ where: { id } });

  if (txn.source !== 'MANUAL' && MANUAL_ONLY.some((f) => body[f] !== undefined)) {
    throw new HttpError(400, 'Giao dịch từ ngân hàng chỉ sửa được danh mục, ghi chú và cờ loại khỏi thống kê');
  }

  const direction = body.direction ?? txn.direction;
  let categoryId = body.categoryId === undefined ? txn.categoryId : body.categoryId;
  if (categoryId) {
    const cat = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
    if (cat.kind !== kindForDirection(direction)) {
      if (body.categoryId !== undefined) throw new HttpError(400, 'Danh mục không khớp loại thu/chi');
      categoryId = null; // đổi chiều thu/chi → bỏ danh mục cũ không còn hợp lệ
    }
  }
  const categoryChanged = body.categoryId !== undefined || categoryId !== txn.categoryId;

  // Sửa số tiền / ngày / chiều / tài khoản → cặp chuyển nội bộ cũ không còn đúng, ghép lại sau khi lưu
  const matchingChanged = (['amount', 'transactionDate', 'direction', 'accountId'] as const).some(
    (f) => body[f] !== undefined
  );
  if (matchingChanged) await releaseTransfer(id);

  await prisma.transaction.update({
    where: { id },
    data: {
      ...(categoryChanged ? { categoryId, categorizedBy: categoryId ? 'MANUAL' : 'NONE' } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.excludeFromStats !== undefined ? { excludeFromStats: body.excludeFromStats } : {}),
      ...(body.amount !== undefined ? { amount: BigInt(body.amount) } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.transactionDate !== undefined ? { transactionDate: new Date(body.transactionDate) } : {}),
      ...(body.direction !== undefined ? { direction: body.direction } : {}),
      ...(body.accountId !== undefined ? { accountId: body.accountId } : {}),
    },
  });
  if (matchingChanged) await detectTransferFor(id);
  return json(await prisma.transaction.findUniqueOrThrow({ where: { id }, select: txnSelect }));
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<'/api/transactions/[id]'>) => {
  const id = parseId((await ctx.params).id);
  const txn = await prisma.transaction.findUniqueOrThrow({ where: { id } });
  if (txn.source !== 'MANUAL') {
    throw new HttpError(
      400,
      'Chỉ xóa được giao dịch nhập tay. Giao dịch ngân hàng có thể đánh dấu "loại khỏi thống kê".'
    );
  }
  // Giao dịch đối ứng (nếu có) được tính lại vào thống kê
  await releaseTransfer(id);
  await prisma.transaction.delete({ where: { id } });
  return json({ ok: true });
});
