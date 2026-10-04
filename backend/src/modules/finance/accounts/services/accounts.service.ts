import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { isUniqueViolation } from '../../../../common/utils/prisma-errors.util';
import { EMAIL_PROVIDERS } from '../../email/providers';
import { CreateAccountDto, UpdateAccountDto } from '../dto/account.dto';

const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

// Cách web ghi nhận giao dịch của một tài khoản (để giải thích độ đầy đủ của số dư)
function trackingOf(a: { type: 'BANK' | 'CASH'; bankName: string | null }) {
  if (a.type === 'CASH') return { method: 'MANUAL' as const, label: 'Nhập tay', in: true, out: true };
  const p = EMAIL_PROVIDERS.find((x) => x.bankName.toLowerCase() === (a.bankName ?? '').toLowerCase());
  if (p) return { method: 'EMAIL' as const, label: `Email ${p.bankName}`, in: p.covers.in, out: p.covers.out };
  return { method: 'MANUAL' as const, label: 'Nhập tay', in: true, out: true };
}

function defaultAccountName(bankName: string | null, accountNumber: string): string {
  const tail = accountNumber.length > 4 ? accountNumber.slice(-4) : accountNumber;
  return `${bankName ?? 'Ngân hàng'} ••${tail}`;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  // Số dư mỗi tài khoản (tính cả giao dịch bị loại khỏi thống kê):
  // - ngân hàng có báo số dư (VD email ACB): số dư báo gần nhất + các giao dịch phát sinh sau đó
  // - còn lại: số dư đầu kỳ + tổng thu − tổng chi
  async listWithBalances() {
    const [accounts, sums, after] = await Promise.all([
      this.prisma.account.findMany({
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
        include: { categoryGroups: { select: { groupId: true } } },
      }),
      this.prisma.$queryRaw<{ accountId: number; direction: 'IN' | 'OUT'; total: bigint; cnt: bigint }[]>`
        SELECT t."accountId", t.direction, SUM(t.amount)::bigint AS total, COUNT(*) AS cnt
        FROM "Transaction" t
        GROUP BY t."accountId", t.direction`,
      this.prisma.$queryRaw<{ accountId: number; direction: 'IN' | 'OUT'; total: bigint }[]>`
        SELECT t."accountId", t.direction, SUM(t.amount)::bigint AS total
        FROM "Transaction" t
        JOIN "Account" a ON a.id = t."accountId"
        WHERE a."bankBalanceAt" IS NOT NULL AND t."transactionDate" > a."bankBalanceAt"
        GROUP BY t."accountId", t.direction`,
    ]);
    const sumOf = (rows: { accountId: number; direction: 'IN' | 'OUT'; total: bigint }[], id: number, d: 'IN' | 'OUT') =>
      n(rows.find((s) => s.accountId === id && s.direction === d)?.total);

    return accounts.map(({ categoryGroups, ...a }) => {
      const cnt = sums.filter((s) => s.accountId === a.id).reduce((acc, s) => acc + n(s.cnt), 0);
      const reported = a.bankBalance !== null && a.bankBalanceAt !== null;
      const balance = reported
        ? n(a.bankBalance) + sumOf(after, a.id, 'IN') - sumOf(after, a.id, 'OUT')
        : n(a.openingBalance) + sumOf(sums, a.id, 'IN') - sumOf(sums, a.id, 'OUT');
      return {
        ...a,
        openingBalance: n(a.openingBalance),
        bankBalance: a.bankBalance === null ? null : n(a.bankBalance),
        balance,
        balanceSource: reported ? ('BANK' as const) : ('COMPUTED' as const),
        tracking: trackingOf(a),
        transactionCount: cnt,
        groupIds: categoryGroups.map((g) => g.groupId),
      };
    });
  }

  async create(dto: CreateAccountDto) {
    if (dto.groupIds?.length) await this.assertGroupsExist(dto.groupIds);
    return this.prisma.account.create({
      data: {
        type: dto.type ?? 'CASH',
        name: dto.name,
        bankName: dto.bankName || null,
        accountNumber: dto.accountNumber || null,
        openingBalance: BigInt(dto.openingBalance ?? 0),
        isActive: dto.isActive ?? true,
        categoryGroups: dto.groupIds?.length ? { create: dto.groupIds.map((groupId) => ({ groupId })) } : undefined,
      },
    });
  }

  async update(id: number, dto: UpdateAccountDto) {
    if (dto.groupIds?.length) await this.assertGroupsExist(dto.groupIds);
    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.openingBalance !== undefined ? { openingBalance: BigInt(dto.openingBalance) } : {}),
        // Gửi groupIds = thay toàn bộ danh sách nhóm của tài khoản
        ...(dto.groupIds !== undefined
          ? { categoryGroups: { deleteMany: {}, create: dto.groupIds.map((groupId) => ({ groupId })) } }
          : {}),
      },
    });
  }

  private async assertGroupsExist(ids: number[]) {
    const found = await this.prisma.categoryGroup.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) throw new BadRequestException('Có nhóm không tồn tại');
  }

  async remove(id: number) {
    const count = await this.prisma.transaction.count({ where: { accountId: id } });
    if (count > 0) throw new BadRequestException(`Tài khoản còn ${count} giao dịch. Hãy ẩn tài khoản thay vì xóa.`);
    await this.prisma.account.delete({ where: { id } });
    return { ok: true };
  }

  // Tài khoản ngân hàng theo số tài khoản (tạo mới nếu chưa có) — dùng khi đọc email ngân hàng
  async getOrCreateBankAccount(accountNumber: string, bankName: string | null) {
    const existing = await this.prisma.account.findUnique({ where: { accountNumber } });
    if (existing) return existing;
    try {
      return await this.prisma.account.create({
        data: { type: 'BANK', name: defaultAccountName(bankName, accountNumber), bankName, accountNumber },
      });
    } catch (e) {
      // Hai giao dịch tới cùng lúc cho một tài khoản mới
      if (isUniqueViolation(e)) return this.prisma.account.findUniqueOrThrow({ where: { accountNumber } });
      throw e;
    }
  }
}
