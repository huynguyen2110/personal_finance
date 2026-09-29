import prisma from '@/lib/prisma';
import { handle, json } from '@/lib/api';
import { scanTransfers, TRANSFER_WINDOW_MINUTES } from '@/lib/transfers';

// Thống kê nhanh số cặp đang có
export const GET = handle(async () => {
  const pairedTxns = await prisma.transaction.count({ where: { transferPairId: { not: null } } });
  return json({ pairs: Math.floor(pairedTxns / 2), windowMinutes: TRANSFER_WINDOW_MINUTES });
});

// Quét lại toàn bộ giao dịch chưa ghép
export const POST = handle(async () => {
  const paired = await scanTransfers();
  const pairedTxns = await prisma.transaction.count({ where: { transferPairId: { not: null } } });
  return json({ paired, pairs: Math.floor(pairedTxns / 2) });
});
