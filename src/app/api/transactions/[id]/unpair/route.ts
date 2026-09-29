import prisma from '@/lib/prisma';
import { handle, json, parseId } from '@/lib/api';
import { txnSelect } from '@/lib/txnQuery';
import { unpairTransfer } from '@/lib/transfers';

// "Không phải chuyển nội bộ": gỡ cặp, tính lại cả hai giao dịch vào thống kê, không tự ghép lại.
export const POST = handle(async (_req: Request, ctx: RouteContext<'/api/transactions/[id]/unpair'>) => {
  const id = parseId((await ctx.params).id);
  await unpairTransfer(id);
  return json(await prisma.transaction.findUniqueOrThrow({ where: { id }, select: txnSelect }));
});
