import prisma from '@/lib/prisma';
import { handle, json, parseBody, parseId, HttpError } from '@/lib/api';
import { CategoryPatch } from '@/lib/schemas';

export const PATCH = handle(async (req: Request, ctx: RouteContext<'/api/categories/[id]'>) => {
  const id = parseId((await ctx.params).id);
  const body = await parseBody(req, CategoryPatch);
  const current = await prisma.category.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { transactions: true } } },
  });
  if (body.kind && body.kind !== current.kind && current._count.transactions > 0) {
    throw new HttpError(400, 'Không đổi được loại thu/chi khi danh mục đã có giao dịch');
  }
  const updated = await prisma.category.update({ where: { id }, data: body });
  return json(updated);
});

// Xóa danh mục: giao dịch thuộc danh mục trở thành "chưa phân loại"; quy tắc và ngân sách bị xóa theo.
export const DELETE = handle(async (_req: Request, ctx: RouteContext<'/api/categories/[id]'>) => {
  const id = parseId((await ctx.params).id);
  await prisma.$transaction([
    prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null, categorizedBy: 'NONE' } }),
    prisma.category.delete({ where: { id } }),
  ]);
  return json({ ok: true });
});
