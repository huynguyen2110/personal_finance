import type { Prisma } from '@prisma/client';

export const txnSelect = {
  id: true,
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  externalId: true,
  source: true,
  direction: true,
  amount: true,
  content: true,
  referenceCode: true,
  transactionDate: true,
  categoryId: true,
  category: { select: { id: true, name: true, icon: true, color: true, kind: true } },
  categorizedBy: true,
  note: true,
  excludeFromStats: true,
  transferPairId: true,
  transferPair: {
    select: { id: true, transactionDate: true, account: { select: { id: true, name: true } } },
  },
} satisfies Prisma.TransactionSelect;

export const SORTS: Record<string, Prisma.TransactionOrderByWithRelationInput[]> = {
  date_desc: [{ transactionDate: 'desc' }, { id: 'desc' }],
  date_asc: [{ transactionDate: 'asc' }, { id: 'asc' }],
  amount_desc: [{ amount: 'desc' }, { id: 'desc' }],
  amount_asc: [{ amount: 'asc' }, { id: 'asc' }],
};
