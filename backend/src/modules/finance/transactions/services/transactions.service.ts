import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { TransfersService } from '../../transfers/services/transfers.service';
import { kindForDirection } from '../../rules/utils/rule-engine';
import { buildTxnWhere } from '../utils/txn-filter';
import { SORTS, txnSelect } from '../utils/txn-query';
import { BulkUpdateTransactionsDto, CreateTransactionDto, UpdateTransactionDto } from '../dto/transaction.dto';

const MANUAL_ONLY = ['amount', 'content', 'transactionDate', 'direction', 'accountId'] as const;

// Cùng một giao dịch có thể về từ hai nguồn (VD email + file nhập).
// Coi là trùng nếu cùng tài khoản, cùng chiều, cùng số tiền, lệch nhau không quá 10 phút.
export const SAME_TXN_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transfers: TransfersService,
  ) {}

  async list(sp: URLSearchParams) {
    const where = buildTxnWhere(sp);
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(sp.get('pageSize')) || 50));
    const orderBy = SORTS[sp.get('sort') ?? ''] ?? SORTS.date_desc;

    const [items, total, sums] = await Promise.all([
      this.prisma.transaction.findMany({ where, select: txnSelect, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({ by: ['direction'], where, _sum: { amount: true } }),
    ]);

    const sumOf = (d: 'IN' | 'OUT') => Number(sums.find((s) => s.direction === d)?._sum.amount ?? 0);
    return { items, total, page, pageSize, sumIn: sumOf('IN'), sumOut: sumOf('OUT') };
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
