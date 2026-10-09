import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { TransfersService } from '../../transfers/services/transfers.service';
import { kindForDirection } from '../../rules/utils/rule-engine';
import { buildTxnWhere } from '../utils/txn-filter';
import { SORTS, txnSelect } from '../utils/txn-query';
import { AlwaysSpendDto, BulkUpdateTransactionsDto, CreateTransactionDto, UpdateTransactionDto } from '../dto/transaction.dto';
import { SELF_TRANSFER_NOTE } from '../../email/utils/email-content';
import { SettingsService } from '../../../../services/settings.service';

const MANUAL_ONLY = ['amount', 'content', 'transactionDate', 'direction', 'accountId'] as const;

// Cùng một giao dịch có thể về từ hai nguồn (VD email + file nhập).
// Coi là trùng nếu cùng tài khoản, cùng chiều, cùng số tiền, lệch nhau không quá 10 phút.
export const SAME_TXN_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transfers: TransfersService,
    private readonly settings: SettingsService,
  ) {}

  async list(sp: URLSearchParams) {
    const where = buildTxnWhere(sp);
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(sp.get('pageSize')) || 50));
    const orderBy = SORTS[sp.get('sort') ?? ''] ?? SORTS.date_desc;

    // Tổng tiền vào/ra và tỷ lệ phân loại chỉ tính giao dịch trong thống kê (bỏ chuyển nội bộ / khoản tự loại ra)
    const statsWhere: Prisma.TransactionWhereInput = { AND: [where, { excludeFromStats: false }] };
    const [items, total, sums, statsCount, statsUncategorized] = await Promise.all([
      this.prisma.transaction.findMany({ where, select: txnSelect, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({ by: ['direction'], where: statsWhere, _sum: { amount: true } }),
      this.prisma.transaction.count({ where: statsWhere }),
      this.prisma.transaction.count({ where: { AND: [statsWhere, { categoryId: null }] } }),
    ]);

    const sumOf = (d: 'IN' | 'OUT') => Number(sums.find((s) => s.direction === d)?._sum.amount ?? 0);
    return { items: await this.withSelfTransferTo(items), total, page, pageSize, sumIn: sumOf('IN'), sumOut: sumOf('OUT'), statsCount, statsUncategorized };
  }

  // Khoản chuyển cho chính mình (tự nhận diện từ email): kèm tài khoản bên nhận/bên gửi lấy từ email gốc
  private async withSelfTransferTo<T extends { id: number; note: string | null }>(items: T[]) {
    const ids = items.filter((t) => t.note?.startsWith(SELF_TRANSFER_NOTE)).map((t) => t.id);
    const raw = ids.length ? await this.prisma.transaction.findMany({ where: { id: { in: ids } }, select: { id: true, rawPayload: true } }) : [];
    const byId = new Map(
      raw.map((r) => {
        const p = (r.rawPayload ?? {}) as { counterpartyAccount?: string | null; counterpartyName?: string | null; counterpartyBank?: string | null };
        return [r.id, p.counterpartyAccount ? { accountNumber: p.counterpartyAccount, name: p.counterpartyName ?? null, bank: p.counterpartyBank ?? null } : null];
      }),
    );
    return items.map((t) => ({ ...t, selfTransferTo: byId.get(t.id) ?? null }));
  }

  // Các tài khoản của chính mình đã nhận tiền chuyển đi (tự nhận diện từ email), kèm có đang "luôn tính chi tiêu" không.
  // Dùng cho mục Cài đặt → Chuyển cho chính bạn.
  async selfTransferAccounts() {
    const rows = await this.prisma.$queryRaw<
      { accountNumber: string; name: string | null; bank: string | null; count: number; counted: number; total: bigint; lastDate: Date }[]
    >`
      SELECT t."rawPayload"->>'counterpartyAccount' AS "accountNumber",
             MAX(t."rawPayload"->>'counterpartyName') AS name,
             MAX(t."rawPayload"->>'counterpartyBank') AS bank,
             COUNT(*)::int AS count,
             SUM(CASE WHEN t."excludeFromStats" THEN 0 ELSE 1 END)::int AS counted,
             SUM(t.amount)::bigint AS total,
             MAX(t."transactionDate") AS "lastDate"
      FROM "Transaction" t
      WHERE t.direction = 'OUT'
        AND t."transferPairId" IS NULL
        AND t.note LIKE ${SELF_TRANSFER_NOTE + '%'}
        AND t."rawPayload"->>'counterpartyAccount' IS NOT NULL
      GROUP BY 1
      ORDER BY MAX(t."transactionDate") DESC`;
    const always = (await this.settings.get()).alwaysSpendAccounts;
    const seen = new Set(rows.map((r) => r.accountNumber));
    return [
      ...rows.map((r) => ({ ...r, total: Number(r.total), alwaysSpend: always.some((a) => a.accountNumber === r.accountNumber) })),
      // Đã bật "luôn tính" nhưng chưa có giao dịch nào (hoặc giao dịch đã bị xóa)
      ...always
        .filter((a) => !seen.has(a.accountNumber))
        .map((a) => ({ ...a, count: 0, counted: 0, total: 0, lastDate: null, alwaysSpend: true })),
    ];
  }

  // Chuyển SANG một tài khoản của chính mình nhưng vẫn tính chi tiêu (VD quỹ phòng): lưu vào cài đặt để áp cho email sau này,
  // đồng thời áp ngay cho các khoản chuyển đi cũ tới tài khoản đó (khoản chưa ghép cặp chuyển nội bộ).
  async setAlwaysSpend(dto: AlwaysSpendDto) {
    const current = (await this.settings.get()).alwaysSpendAccounts.filter((a) => a.accountNumber !== dto.accountNumber);
    const alwaysSpendAccounts = dto.enabled
      ? [...current, { accountNumber: dto.accountNumber, name: dto.name ?? null, bank: dto.bank ?? null }]
      : current;
    await this.settings.update({ alwaysSpendAccounts });
    const r = await this.prisma.transaction.updateMany({
      where: {
        direction: 'OUT',
        transferPairId: null,
        note: { startsWith: SELF_TRANSFER_NOTE },
        rawPayload: { path: ['counterpartyAccount'], equals: dto.accountNumber },
        excludeFromStats: dto.enabled,
      },
      data: { excludeFromStats: !dto.enabled },
    });
    return { updated: r.count, alwaysSpendAccounts };
  }

  findOne(id: number) {
    return this.prisma.transaction.findUniqueOrThrow({ where: { id }, select: txnSelect });
  }

  private async assertCategoryMatches(categoryId: number, direction: 'IN' | 'OUT') {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new BadRequestException('Danh mục không tồn tại');
    if (cat.kind !== kindForDirection(direction)) throw new BadRequestException('Danh mục không khớp loại thu/chi');
  }

  async create(dto: CreateTransactionDto) {
    if (dto.categoryId) await this.assertCategoryMatches(dto.categoryId, dto.direction);
    const created = await this.prisma.transaction.create({
      data: {
        accountId: dto.accountId,
        source: 'MANUAL',
        direction: dto.direction,
        amount: BigInt(dto.amount),
        content: dto.content,
        transactionDate: new Date(dto.transactionDate),
        categoryId: dto.categoryId ?? null,
        categorizedBy: dto.categoryId ? 'MANUAL' : 'NONE',
        note: dto.note ?? null,
        excludeFromStats: dto.excludeFromStats ?? false,
      },
      select: { id: true },
    });
    // VD: rút tiền ATM (chi ở ngân hàng) + nhập tay khoản thu vào ví tiền mặt → tự ghép cặp
    await this.transfers.detectTransferFor(created.id);
    return this.findOne(created.id);
  }

  async update(id: number, dto: UpdateTransactionDto) {
    const txn = await this.prisma.transaction.findUniqueOrThrow({ where: { id } });
    if (txn.source !== 'MANUAL' && MANUAL_ONLY.some((f) => dto[f] !== undefined)) {
      throw new BadRequestException('Giao dịch từ ngân hàng chỉ sửa được danh mục, ghi chú và cờ loại khỏi thống kê');
    }

    const direction = dto.direction ?? txn.direction;
    let categoryId = dto.categoryId === undefined ? txn.categoryId : dto.categoryId;
    if (categoryId) {
      const cat = await this.prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
      if (cat.kind !== kindForDirection(direction)) {
        if (dto.categoryId !== undefined) throw new BadRequestException('Danh mục không khớp loại thu/chi');
        categoryId = null; // đổi chiều thu/chi → bỏ danh mục cũ không còn hợp lệ
      }
    }
    const categoryChanged = dto.categoryId !== undefined || categoryId !== txn.categoryId;

    // Sửa số tiền / ngày / chiều / tài khoản → cặp chuyển nội bộ cũ không còn đúng, ghép lại sau khi lưu
    const matchingChanged = (['amount', 'transactionDate', 'direction', 'accountId'] as const).some(
      (f) => dto[f] !== undefined,
    );
    if (matchingChanged) await this.transfers.releaseTransfer(id);

    await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(categoryChanged ? { categoryId, categorizedBy: categoryId ? 'MANUAL' : 'NONE' } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.excludeFromStats !== undefined ? { excludeFromStats: dto.excludeFromStats } : {}),
        ...(dto.amount !== undefined ? { amount: BigInt(dto.amount) } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.transactionDate !== undefined ? { transactionDate: new Date(dto.transactionDate) } : {}),
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
        ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
      },
    });
    if (matchingChanged) await this.transfers.detectTransferFor(id);
    return this.findOne(id);
  }

  async remove(id: number) {
    const txn = await this.prisma.transaction.findUniqueOrThrow({ where: { id } });
    if (txn.source !== 'MANUAL') {
      throw new BadRequestException(
        'Chỉ xóa được giao dịch nhập tay. Giao dịch ngân hàng có thể đánh dấu "loại khỏi thống kê".',
      );
    }
    // Giao dịch đối ứng (nếu có) được tính lại vào thống kê
    await this.transfers.releaseTransfer(id);
    await this.prisma.transaction.delete({ where: { id } });
    return { ok: true };
  }

  // "Không phải chuyển nội bộ": gỡ cặp, tính lại cả hai giao dịch vào thống kê, không tự ghép lại.
  async unpair(id: number) {
    await this.transfers.unpairTransfer(id);
    return this.findOne(id);
  }

  // Danh mục chỉ áp cho giao dịch cùng chiều với loại danh mục; số còn lại bị bỏ qua.
  async bulkUpdate(dto: BulkUpdateTransactionsDto) {
    let updated = 0;
    let skipped = 0;

    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        const r = await this.prisma.transaction.updateMany({
          where: { id: { in: dto.ids } },
          data: { categoryId: null, categorizedBy: 'NONE' },
        });
        updated = r.count;
      } else {
        const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
        if (!cat) throw new BadRequestException('Danh mục không tồn tại');
        const r = await this.prisma.transaction.updateMany({
          where: { id: { in: dto.ids }, direction: cat.kind === 'INCOME' ? 'IN' : 'OUT' },
          data: { categoryId: cat.id, categorizedBy: 'MANUAL' },
        });
        updated = r.count;
        skipped = dto.ids.length - r.count;
      }
    }

    if (dto.excludeFromStats !== undefined) {
      const r = await this.prisma.transaction.updateMany({
        where: { id: { in: dto.ids } },
        data: { excludeFromStats: dto.excludeFromStats },
      });
      updated = Math.max(updated, r.count);
    }

    return { updated, skipped };
  }

  // Giao dịch trùng đến từ nguồn khác (xem SAME_TXN_WINDOW_MS)
  findSameTransaction(opts: {
    accountId: number;
    direction: 'IN' | 'OUT';
    amount: bigint;
    at: Date;
    where: Prisma.TransactionWhereInput;
  }) {
    return this.prisma.transaction.findFirst({
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
}
