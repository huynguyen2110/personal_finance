import prisma from '@/lib/prisma';
import { handle, json, parseBody, HttpError } from '@/lib/api';
import { RuleCreate } from '@/lib/schemas';
import { compileRule } from '@/lib/categorize';

export const GET = handle(async () => {
  const rules = await prisma.categoryRule.findMany({
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    include: { category: { select: { id: true, name: true, icon: true, color: true, kind: true } } },
  });
  return json(rules);
});

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, RuleCreate);
  if (!compileRule(body.matchType, body.pattern)) throw new HttpError(400, 'Mẫu không hợp lệ');
  const created = await prisma.categoryRule.create({ data: body });
  return json(created, { status: 201 });
});
