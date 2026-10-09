import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { startOfVNDay } from '../../../../common/utils/dates.util';
import { isUniqueViolation } from '../../../../common/utils/prisma-errors.util';
import { CategorizeService } from '../../rules/services/categorize.service';
import type { CategorizeContext } from '../../rules/services/categorize.service';
import { TransfersService } from '../../transfers/services/transfers.service';
import { AccountsService } from '../../accounts/services/accounts.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { emailContent, isSelfTransfer, SELF_TRANSFER_NOTE } from '../utils/email-content';
import { SettingsService } from '../../../../services/settings.service';
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
    private readonly settings: SettingsService,
  ) {}

  // Email có báo số dư (VD ACB) → lưu làm số dư ngân hàng báo, chỉ khi mới hơn lần báo trước
  private async updateBankBalance(accountId: number, p: ParsedBankEmail) {
    if (p.balanceAfter === null) return;
    await this.prisma.account.updateMany({
      where: { id: accountId, OR: [{ bankBalanceAt: null }, { bankBalanceAt: { lte: p.transactionDate } }] },
      data: { bankBalance: BigInt(p.balanceAfter), bankBalanceAt: p.transactionDate },
    });
  }

  // Giao dịch nguồn EMAIL có ngày trước "ngày bắt đầu lấy dữ liệu" (dữ liệu các tháng cũ không đầy đủ)
  private beforeStartWhere(startDate: string): Prisma.TransactionWhereInput {
    return { source: 'EMAIL', transactionDate: { lt: startOfVNDay(startDate) } };
  }

  async countBeforeStart(startDate: string): Promise<{ count: number; total: number }> {
    const [count, total] = await Promise.all([
      this.prisma.transaction.count({ where: this.beforeStartWhere(startDate) }),
      this.prisma.transaction.count({ where: { source: 'EMAIL' } }),
    ]);
    return { count, total };
  }

  // Xóa giao dịch email trước ngày bắt đầu. Khoản nạp quỹ gắn với các giao dịch này được giữ lại (chỉ mất liên kết).
  async purgeBeforeStart(startDate: string): Promise<{ deleted: number }> {
    const r = await this.prisma.transaction.deleteMany({ where: this.beforeStartWhere(startDate) });
    return { deleted: r.count };
  }

  // Lưu một giao dịch đọc từ email ngân hàng. Idempotent theo externalId (mã giao dịch của ngân hàng).
  async ingest(p: ParsedBankEmail, meta: { messageId?: string | null } = {}, ctx?: CategorizeContext): Promise<EmailIngestResult> {
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
    // Tài khoản bên kia là một tài khoản đã có trong app → chắc chắn là chuyển nội bộ
    const toOwnAccount = p.counterpartyAccount
      ? !!(await this.prisma.account.findUnique({ where: { accountNumber: p.counterpartyAccount }, select: { id: true } }))
      : false;
    const internal = isSelfTransfer(p) || toOwnAccount;
    // Chuyển sang tài khoản của chính mình nhưng người dùng muốn luôn tính chi tiêu (VD tài khoản quỹ phòng)
    const alwaysSpend =
      internal && p.direction === 'OUT' && !!p.counterpartyAccount && (await this.settings.alwaysSpendAccountNumbers()).has(p.counterpartyAccount);
    const excluded = internal && !alwaysSpend;
    const cat = this.categorize.resolve(ctx ?? (await this.categorize.loadContext()), {
      content,
      direction: p.direction,
      accountId: account.id,
      excludeFromStats: excluded,
    });

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
          categoryId: cat.categoryId,
          categorizedBy: cat.categorizedBy,
          excludeFromStats: excluded,
          note: internal ? SELF_TRANSFER_NOTE : null,
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

    // Phía bên kia (VD Cake nhận tiền từ VCB) cũng đã có trong app → ghép cặp chuyển nội bộ.
    // Khoản "luôn tính chi tiêu" thì không ghép (ghép cặp sẽ loại nó khỏi thống kê).
    if (!alwaysSpend) {
      await this.transfers.detectTransferFor(createdId).catch((e) => this.logger.error(`Ghép chuyển nội bộ lỗi: ${e}`));
    }

    return { status: 'created', id: createdId, internal };
  }
}
