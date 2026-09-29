import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody, HttpError } from '@/lib/api';
import { buildTxnWhere } from '@/lib/txnFilter';
import { txnSelect, SORTS } from '@/lib/txnQuery';
import { kindForDirection } from '@/lib/categorize';
import { detectTransferFor } from '@/lib/transfers';

export const GET = handle(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const where = buildTxnWhere(sp);
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.min(200, Math.max(10, Number(sp.get('pageSize')) || 50));
  const orderBy = SORTS[sp.get('sort') ?? ''] ?? SORTS.date_desc;

  const [items, total, sums] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: txnSelect,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ['direction'], where, _sum: { amount: true } }),
  ]);

  const sumOf = (d: 'IN' | 'OUT') => Number(sums.find((s) => s.direction === d)?._sum.amount ?? 0);
  return json({ items, total, page, pageSize, sumIn: sumOf('IN'), sumOut: sumOf('OUT') });
});

// Nhập tay giao dịch (tiền mặt hoặc bổ sung cho tài khoản bất kỳ)
const CreateBody = z.object({
  accountId: z.number().int().positive(),
  direction: z.enum(['IN', 'OUT']),
  amount: z.number().int().positive().max(1e13),
  content: z.string().trim().min(1, { error: 'Nhập nội dung' }).max(500),
  transactionDate: z.iso.datetime({ offset: true }),
  categoryId: z.number().int().positive().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  excludeFromStats: z.boolean().optional(),
});

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, CreateBody);
  if (body.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!cat) throw new HttpError(400, 'Danh mục không tồn tại');
    if (cat.kind !== kindForDirection(body.direction)) {
      throw new HttpError(400, 'Danh mục không khớp loại thu/chi');
    }
  }
  const created = await prisma.transaction.create({
    data: {
      accountId: body.accountId,
      source: 'MANUAL',
      direction: body.direction,
      amount: BigInt(body.amount),
      content: body.content,
      transactionDate: new Date(body.transactionDate),
      categoryId: body.categoryId ?? null,
      categorizedBy: body.categoryId ? 'MANUAL' : 'NONE',
      note: body.note ?? null,
      excludeFromStats: body.excludeFromStats ?? false,
    },
    select: { id: true },
  });
  // VD: rút tiền ATM (chi ở ngân hàng) + nhập tay khoản thu vào ví tiền mặt → tự ghép cặp
  await detectTransferFor(created.id);
  const full = await prisma.transaction.findUniqueOrThrow({ where: { id: created.id }, select: txnSelect });
  return json(full, { status: 201 });
});
