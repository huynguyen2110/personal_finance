import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { findMatchingRule, loadActiveRules, type RuleWithKind } from '../categorize';
import { detectTransferFor } from '../transfers';
import { findSameTransaction, getOrCreateBankAccount, isUniqueViolation } from '../ingest';
import { norm } from './tokens';
import type { ParsedBankEmail } from './types';

export type EmailIngestStatus = 'created' | 'duplicate' | 'merged';

export interface EmailIngestResult {
  status: EmailIngestStatus;
  id: number;
  internal: boolean;
}

// Người bên kia trùng tên chủ tài khoản → gần như chắc chắn chuyển giữa các tài khoản của chính mình
export function isSelfTransfer(p: ParsedBankEmail): boolean {
  return !!p.ownerName && !!p.counterpartyName && norm(p.ownerName) === norm(p.counterpartyName);
}

// Nội dung lưu vào giao dịch: nội dung CK + bên kia + ngân hàng (giúp quy tắc phân loại khớp tên cửa hàng)
export function emailContent(p: ParsedBankEmail): string {
  const parts = [p.details || p.kind || (p.direction === 'OUT' ? 'Chuyển tiền' : 'Nhận tiền')];
  if (p.counterpartyName) parts.push(`${p.direction === 'OUT' ? '→' : '←'} ${p.counterpartyName}`);
  if (p.counterpartyBank) parts.push(`(${p.counterpartyBank})`);
  return parts.join(' ');
}

// Email có báo số dư (VD ACB) → lưu làm số dư ngân hàng báo, chỉ khi mới hơn lần báo trước
async function updateBankBalance(accountId: number, p: ParsedBankEmail) {
  if (p.balanceAfter === null) return;
  await prisma.account.updateMany({
    where: { id: accountId, OR: [{ bankBalanceAt: null }, { bankBalanceAt: { lte: p.transactionDate } }] },
    data: { bankBalance: BigInt(p.balanceAfter), bankBalanceAt: p.transactionDate },
  });
}

// Lưu một giao dịch đọc từ email ngân hàng. Idempotent theo externalId (mã giao dịch của ngân hàng).
export async function ingestBankEmail(
  p: ParsedBankEmail,
  meta: { messageId?: string | null } = {},
  rules?: RuleWithKind[]
): Promise<EmailIngestResult> {
  const existing = await prisma.transaction.findUnique({ where: { externalId: p.externalId }, select: { id: true } });
  if (existing) return { status: 'duplicate', id: existing.id, internal: false };

  const account = await getOrCreateBankAccount(p.accountNumber, p.bankName);
  const amount = BigInt(p.amount);

  // Đã có từ nguồn nhập khác (cùng tài khoản, số tiền, ±10 phút) → chỉ gắn thêm mã giao dịch
  const same = await findSameTransaction({
    accountId: account.id,
    direction: p.direction,
    amount,
    at: p.transactionDate,
    where: { externalId: null, source: 'IMPORT' },
  });
  if (same) {
    await prisma.transaction.update({
      where: { id: same.id },
      data: { externalId: p.externalId, referenceCode: same.referenceCode ?? p.referenceCode },
    });
    await updateBankBalance(account.id, p);
    return { status: 'merged', id: same.id, internal: same.excludeFromStats };
  }

  const content = emailContent(p);
  const rule = findMatchingRule(rules ?? (await loadActiveRules()), content, p.direction);
  // Tài khoản bên kia là một tài khoản đã có trong app → chắc chắn là chuyển nội bộ
  const toOwnAccount = p.counterpartyAccount
    ? !!(await prisma.account.findUnique({ where: { accountNumber: p.counterpartyAccount }, select: { id: true } }))
    : false;
  const internal = isSelfTransfer(p) || toOwnAccount;

  let createdId: number;
  try {
    const created = await prisma.transaction.create({
      data: {
        accountId: account.id,
        externalId: p.externalId,
        source: 'EMAIL',
        direction: p.direction,
        amount,
        content,
        referenceCode: p.referenceCode,
        transactionDate: p.transactionDate,
        categoryId: rule?.categoryId ?? null,
        categorizedBy: rule ? 'RULE' : 'NONE',
        excludeFromStats: internal,
        note: internal ? 'Chuyển giữa các tài khoản của chính bạn (tự nhận diện từ email)' : null,
        rawPayload: {
          ...p,
          transactionDate: p.transactionDate.toISOString(),
          messageId: meta.messageId ?? null,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (e) {
    if (isUniqueViolation(e)) {
      const again = await prisma.transaction.findUniqueOrThrow({ where: { externalId: p.externalId }, select: { id: true } });
      return { status: 'duplicate', id: again.id, internal };
    }
    throw e;
  }

  await updateBankBalance(account.id, p);

  // Phí giao dịch ghi thành khoản chi riêng
  if (p.fee > 0) {
    await prisma.transaction
      .create({
        data: {
          accountId: account.id,
          externalId: `${p.externalId}:fee`,
          source: 'EMAIL',
          direction: 'OUT',
          amount: BigInt(p.fee),
          content: `Phí giao dịch ${p.bankName} (mã ${p.referenceCode})`,
          referenceCode: p.referenceCode,
          transactionDate: p.transactionDate,
        },
      })
      .catch((e) => {
        if (!isUniqueViolation(e)) throw e;
      });
  }

  // Phía bên kia (VD Cake nhận tiền từ VCB) cũng đã có trong app → ghép cặp chuyển nội bộ
  await detectTransferFor(createdId).catch((e) => console.error('[transfer] detect failed', e));

  return { status: 'created', id: createdId, internal };
}
