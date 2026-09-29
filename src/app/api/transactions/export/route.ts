import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { handle } from '@/lib/api';
import { buildTxnWhere } from '@/lib/txnFilter';
import { SORTS } from '@/lib/txnQuery';
import { todayVN } from '@/lib/dates';
import {
  DATETIME_FMT,
  MONEY_FMT,
  styleBody,
  styleHeader,
  styleTotal,
  toExcelVNDate,
  xlsxResponse,
} from '@/lib/excel';

const MAX_ROWS = 50_000;
const SOURCE_LABEL = { EMAIL: 'Email ngân hàng', MANUAL: 'Nhập tay', IMPORT: 'Nhập dữ liệu' } as const;

// Xuất Excel theo đúng bộ lọc đang dùng ở trang Giao dịch
export const GET = handle(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const txns = await prisma.transaction.findMany({
    where: buildTxnWhere(sp),
    include: { account: true, category: true, transferPair: { include: { account: true } } },
    orderBy: SORTS[sp.get('sort') ?? ''] ?? SORTS.date_desc,
    take: MAX_ROWS,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chi tiêu cá nhân';
  const ws = wb.addWorksheet('Giao dịch', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Ngày giờ', key: 'date', width: 18, style: { numFmt: DATETIME_FMT } },
    { header: 'Tài khoản', key: 'account', width: 22 },
    { header: 'Loại', key: 'type', width: 8 },
    { header: 'Thu', key: 'in', width: 15, style: { numFmt: MONEY_FMT } },
    { header: 'Chi', key: 'out', width: 15, style: { numFmt: MONEY_FMT } },
    { header: 'Danh mục', key: 'category', width: 22 },
    { header: 'Nội dung', key: 'content', width: 50 },
    { header: 'Ghi chú', key: 'note', width: 28 },
    { header: 'Mã tham chiếu', key: 'ref', width: 18 },
    { header: 'Nguồn', key: 'source', width: 11 },
    { header: 'Loại khỏi TK', key: 'excluded', width: 12 },
    { header: 'Chuyển nội bộ với', key: 'transfer', width: 22 },
  ];
  styleHeader(ws.getRow(1));

  let totalIn = 0;
  let totalOut = 0;
  for (const t of txns) {
    const amount = Number(t.amount);
    if (t.direction === 'IN') totalIn += amount;
    else totalOut += amount;
    ws.addRow({
      date: toExcelVNDate(t.transactionDate),
      account: t.account.name,
      type: t.direction === 'IN' ? 'Thu' : 'Chi',
      in: t.direction === 'IN' ? amount : null,
      out: t.direction === 'OUT' ? amount : null,
      category: t.category?.name ?? 'Chưa phân loại',
      content: t.content,
      note: t.note ?? '',
      ref: t.referenceCode ?? '',
      source: SOURCE_LABEL[t.source],
      excluded: t.excludeFromStats ? 'Có' : '',
      transfer: t.transferPair?.account.name ?? '',
    });
  }
  styleBody(ws);
  const total = ws.addRow({ date: null, account: `Tổng (${txns.length} giao dịch)`, in: totalIn, out: totalOut });
  styleTotal(total);
  ws.autoFilter = { from: 'A1', to: 'L1' };

  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const suffix = from || to ? `${from}_${to}` : todayVN();
  return xlsxResponse(wb, `giao-dich_${suffix}.xlsx`);
});
