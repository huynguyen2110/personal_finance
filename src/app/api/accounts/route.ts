import prisma from '@/lib/prisma';
import { handle, json, parseBody } from '@/lib/api';
import { AccountCreate } from '@/lib/schemas';
import { getAccountBalances } from '@/lib/stats';

export const GET = handle(async () => json(await getAccountBalances()));

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, AccountCreate);
  const created = await prisma.account.create({
    data: {
      ...body,
      accountNumber: body.accountNumber || null,
      openingBalance: BigInt(body.openingBalance),
    },
  });
  return json(created, { status: 201 });
});
