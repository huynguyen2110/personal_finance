import prisma from '@/lib/prisma';
import { handle, json, parseBody, parseId, HttpError } from '@/lib/api';
import { RulePatch } from '@/lib/schemas';
import { compileRule } from '@/lib/categorize';

export const PATCH = handle(async (req: Request, ctx: RouteContext<'/api/rules/[id]'>) => {
  const id = parseId((await ctx.params).id);
  const body = await parseBody(req, RulePatch);
  const current = await prisma.categoryRule.findUniqueOrThrow({ where: { id } });
  if (!compileRule(body.matchType ?? current.matchType, body.pattern ?? current.pattern)) {
    throw new HttpError(400, 'Mẫu không hợp lệ');
  }
  const updated = await prisma.categoryRule.update({ where: { id }, data: body });
  return json(updated);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<'/api/rules/[id]'>) => {
  const id = parseId((await ctx.params).id);
  await prisma.categoryRule.delete({ where: { id } });
  return json({ ok: true });
});
