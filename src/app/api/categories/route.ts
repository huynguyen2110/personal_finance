import prisma from '@/lib/prisma';
import { handle, json, parseBody } from '@/lib/api';
import { CategoryCreate } from '@/lib/schemas';

export const GET = handle(async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { transactions: true, rules: true } } },
  });
  return json(categories);
});

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, CategoryCreate);
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.category.create({
    data: { ...body, sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1 },
  });
  return json(created, { status: 201 });
});
