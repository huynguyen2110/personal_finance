import { Prisma } from '@prisma/client';
import prisma from './prisma';

// Công cụ chung khi ghi nhận giao dịch từ các nguồn tự động (email ngân hàng, nhập file…).

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

function defaultAccountName(bankName: string | null, accountNumber: string): string {
  const tail = accountNumber.length > 4 ? accountNumber.slice(-4) : accountNumber;
  return `${bankName ?? 'Ngân hàng'} ••${tail}`;
}

// Tài khoản ngân hàng theo số tài khoản (tạo mới nếu chưa có).
export async function getOrCreateBankAccount(accountNumber: string, bankName: string | null) {
  const existing = await prisma.account.findUnique({ where: { accountNumber } });
  if (existing) return existing;
  try {
    return await prisma.account.create({
      data: { type: 'BANK', name: defaultAccountName(bankName, accountNumber), bankName, accountNumber },
    });
  } catch (e) {
    // Hai giao dịch tới cùng lúc cho một tài khoản mới
    if (isUniqueViolation(e)) return prisma.account.findUniqueOrThrow({ where: { accountNumber } });
    throw e;
  }
}

// Cùng một giao dịch có thể về từ hai nguồn (VD email + file sao kê).
// Coi là trùng nếu cùng tài khoản, cùng chiều, cùng số tiền, lệch nhau không quá 10 phút.
export const SAME_TXN_WINDOW_MS = 10 * 60 * 1000;

export async function findSameTransaction(opts: {
  accountId: number;
  direction: 'IN' | 'OUT';
  amount: bigint;
  at: Date;
  where: Prisma.TransactionWhereInput;
}) {
  return prisma.transaction.findFirst({
    where: {
      ...opts.where,
      accountId: opts.accountId,
      direction: opts.direction,
      amount: opts.amount,
      transactionDate: {
        gte: new Date(opts.at.getTime() - SAME_TXN_WINDOW_MS),
        lte: new Date(opts.at.getTime() + SAME_TXN_WINDOW_MS),
      },
    },
    orderBy: { id: 'asc' },
  });
}
