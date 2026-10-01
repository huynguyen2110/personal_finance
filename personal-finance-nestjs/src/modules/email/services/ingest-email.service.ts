import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.util';
import { CategorizeService } from '../../rules/services/categorize.service';
import { findMatchingRule, type RuleWithKind } from '../../rules/utils/rule-engine';
import { TransfersService } from '../../transfers/services/transfers.service';
import { AccountsService } from '../../accounts/services/accounts.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { emailContent, isSelfTransfer } from '../utils/email-content';
import type { ParsedBankEmail } from '../types';

export type EmailIngestStatus = 'created' | 'duplicate' | 'merged';

export interface EmailIngestResult {
  status: EmailIngestStatus;
  id: number;
  internal: boolean;
}

@Injectable()
export class IngestEmailService {
  private readonly logger = new Logger(IngestEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly categorize: CategorizeService,
    private readonly transfers: TransfersService,
    private readonly accounts: AccountsService,
    private readonly transactions: TransactionsService,
  ) {}

  // Email có báo số dư (VD ACB) → lưu làm số dư ngân hàng báo, chỉ khi mới hơn lần báo trước
  private async updateBankBalance(accountId: number, p: ParsedBankEmail) {
    if (p.balanceAfter === null) return;
    await this.prisma.account.updateMany({
      where: { id: accountId, OR: [{ bankBalanceAt: null }, { bankBalanceAt: { lte: p.transactionDate } }] },
      data: { bankBalance: BigInt(p.balanceAfter), bankBalanceAt: p.transactionDate },
    });
  }

  // Lưu một giao dịch đọc từ email ngân hàng. Idempotent theo externalId (mã giao dịch của ngân hàng).
  async ingest(p: ParsedBankEmail, meta: { messageId?: string | null } = {}, rules?: RuleWithKind[]): Promise<EmailIngestResult> {
    const existing = await this.prisma.transaction.findUnique({ where: { externalId: p.externalId }, select: { id: true } });
    if (existing) return { status: 'duplicate', id: existing.id, internal: false };

    const account = await this.accounts.getOrCreateBankAccount(p.accountNumber, p.bankName);
    const amount = BigInt(p.amount);

    // Đã có từ nguồn nhập khác (cùng tài khoản, số tiền, ±10 phút) → chỉ gắn thêm mã giao dịch
    const same = await this.transactions.findSameTransaction({
      accountId: account.id,
      direction: p.direction,
      amount,
      at: p.transactionDate,
      where: { externalId: null, source: 'IMPORT' },
    });
    if (same) {
      await this.prisma.transaction.update({
        where: { id: same.id },
        data: { externalId: p.externalId, referenceCode: same.referenceCode ?? p.referenceCode },
      });
      await this.updateBankBalance(account.id, p);
      return { status: 'merged', id: same.id, internal: same.excludeFromStats };
    }

    const content = emailContent(p);
    const rule = findMatchingRule(rules ?? (await this.categorize.loadActiveRules()), content, p.direction);
    // Tài khoản bên kia là một tài khoản đã có trong app → chắc chắn là chuyển nội bộ
    const toOwnAccount = p.counterpartyAccount
      ? !!(await this.prisma.account.findUnique({ where: { accountNumber: p.counterpartyAccount }, select: { id: true } }))
      : false;
    const internal = isSelfTransfer(p) || toOwnAccount;

    let createdId: number;
    try {
      const created = await this.prisma.transaction.create({
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
        const again = await this.prisma.transaction.findUniqueOrThrow({
          where: { externalId: p.externalId },
          select: { id: true },
        });
        return { status: 'duplicate', id: again.id, internal };
      }
      throw e;
    }

    await this.updateBankBalance(account.id, p);

    // Phí giao dịch ghi thành khoản chi riêng
    if (p.fee > 0) {
      await this.prisma.transaction
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
    await this.transfers.detectTransferFor(createdId).catch((e) => this.logger.error(`Ghép chuyển nội bộ lỗi: ${e}`));

    return { status: 'created', id: createdId, internal };
  }
}
