import prisma from '@/lib/prisma';
import { handle, json, parseBody, parseId, HttpError } from '@/lib/api';
import { AccountPatch } from '@/lib/schemas';

export const PATCH = handle(async (req: Request, ctx: RouteContext<'/api/accounts/[id]'>) => {
  const id = parseId((await ctx.params).id);
  const body = await parseBody(req, AccountPatch);
  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...body,
      ...(body.openingBalance !== undefined ? { openingBalance: BigInt(body.openingBalance) } : {}),
    },
  });
  return json(updated);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<'/api/accounts/[id]'>) => {
  const id = parseId((await ctx.params).id);
  const count = await prisma.transaction.count({ where: { accountId: id } });
  if (count > 0) {
    throw new HttpError(400, `Tài khoản còn ${count} giao dịch. Hãy ẩn tài khoản thay vì xóa.`);
  }
  await prisma.account.delete({ where: { id } });
  return json({ ok: true });
});
