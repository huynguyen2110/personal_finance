import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

// Tự nhận diện chuyển khoản nội bộ (giữa các tài khoản của chính mình):
// một giao dịch RA và một giao dịch VÀO cùng số tiền, ở hai tài khoản khác nhau,
// cách nhau không quá TRANSFER_WINDOW_MINUTES → ghép cặp và loại cả hai khỏi thống kê.
// Khoảng 15 phút đủ cho ngân hàng báo chậm, và hiếm khi trùng ngẫu nhiên.
export const TRANSFER_WINDOW_MINUTES = 15;
const WINDOW_MS = TRANSFER_WINDOW_MINUTES * 60 * 1000;

interface Candidate {
  id: number;
  accountId: number;
  direction: 'IN' | 'OUT';
  amount: bigint;
  transactionDate: Date;
}

const candidateSelect = {
  id: true,
  accountId: true,
  direction: true,
  amount: true,
  transactionDate: true,
} as const;

function closest(target: Candidate, list: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  let bestDiff = Infinity;
  for (const c of list) {
    const diff = Math.abs(c.transactionDate.getTime() - target.transactionDate.getTime());
    if (diff < bestDiff || (diff === bestDiff && best && c.id < best.id)) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
}

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  // Ghép hai giao dịch; thất bại (trả false) nếu một trong hai đã được ghép ở nơi khác.
  private async pair(aId: number, bId: number): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const a = await tx.transaction.updateMany({
          where: { id: aId, transferPairId: null },
          data: { transferPairId: bId, excludeFromStats: true },
        });
        const b = await tx.transaction.updateMany({
          where: { id: bId, transferPairId: null },
          data: { transferPairId: aId, excludeFromStats: true },
        });
        if (a.count !== 1 || b.count !== 1) throw new Error('already paired');
      });
      return true;
    } catch {
      return false;
    }
  }

  // Tìm và ghép cặp cho một giao dịch vừa lưu. Trả về id giao dịch đối ứng, hoặc null.
  async detectTransferFor(id: number): Promise<number | null> {
    const t = await this.prisma.transaction.findUnique({
      where: { id },
      select: { ...candidateSelect, transferPairId: true, transferIgnored: true },
    });
    if (!t || t.transferPairId !== null || t.transferIgnored) return null;

    const candidates = await this.prisma.transaction.findMany({
      where: {
        id: { not: t.id },
        accountId: { not: t.accountId },
        direction: t.direction === 'IN' ? 'OUT' : 'IN',
        amount: t.amount,
        transferPairId: null,
        transferIgnored: false,
        transactionDate: {
          gte: new Date(t.transactionDate.getTime() - WINDOW_MS),
          lte: new Date(t.transactionDate.getTime() + WINDOW_MS),
        },
      },
      select: candidateSelect,
      take: 20,
    });

    const partner = closest(t, candidates);
    if (!partner) return null;
    return (await this.pair(t.id, partner.id)) ? partner.id : null;
  }

  // Quét toàn bộ giao dịch chưa ghép (dùng sau khi thêm tài khoản mới / nhập dữ liệu cũ).
  async scanTransfers(): Promise<number> {
    const all = await this.prisma.transaction.findMany({
      where: { transferPairId: null, transferIgnored: false },
      select: candidateSelect,
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
    });

    // Nhóm theo số tiền; trong mỗi nhóm, mỗi khoản RA tìm khoản VÀO gần nhất ở tài khoản khác.
    const byAmount = new Map<string, Candidate[]>();
    for (const t of all) {
      const key = t.amount.toString();
      if (!byAmount.has(key)) byAmount.set(key, []);
      byAmount.get(key)!.push(t);
    }

    let paired = 0;
    for (const group of byAmount.values()) {
      const ins = group.filter((t) => t.direction === 'IN');
      if (!ins.length) continue;
      const used = new Set<number>();
      for (const out of group.filter((t) => t.direction === 'OUT')) {
        const options = ins.filter(
          (i) =>
            !used.has(i.id) &&
            i.accountId !== out.accountId &&
            Math.abs(i.transactionDate.getTime() - out.transactionDate.getTime()) <= WINDOW_MS,
        );
        const partner = closest(out, options);
        if (partner && (await this.pair(out.id, partner.id))) {
          used.add(partner.id);
          paired++;
        }
      }
    }
    return paired;
  }

  // Người dùng xác nhận không phải chuyển nội bộ: gỡ cặp, tính lại vào thống kê, không tự ghép lại.
  async unpairTransfer(id: number): Promise<void> {
    const t = await this.prisma.transaction.findUniqueOrThrow({ where: { id }, select: { transferPairId: true } });
    if (t.transferPairId === null) return;
    await this.prisma.transaction.updateMany({
      where: { id: { in: [id, t.transferPairId] } },
      data: { transferPairId: null, excludeFromStats: false, transferIgnored: true },
    });
  }

  // Gỡ cặp không đánh dấu "bỏ qua" (khi giao dịch bị xóa hoặc sửa số tiền/ngày/tài khoản).
  async releaseTransfer(id: number): Promise<void> {
    const t = await this.prisma.transaction.findUnique({ where: { id }, select: { transferPairId: true } });
    if (!t || t.transferPairId === null) return;
    await this.prisma.transaction.updateMany({
      where: { id: { in: [id, t.transferPairId] } },
      data: { transferPairId: null, excludeFromStats: false },
    });
  }

  async countPairs(): Promise<number> {
    const pairedTxns = await this.prisma.transaction.count({ where: { transferPairId: { not: null } } });
    return Math.floor(pairedTxns / 2);
  }
}
