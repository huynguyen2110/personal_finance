import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { handle } from '@/lib/api';
import { formatMonthLabel } from '@/lib/dates';
import { getReport, parseReportScope } from '@/lib/reports';
import { MONEY_FMT, styleBody, styleHeader, styleTotal, xlsxResponse } from '@/lib/excel';

export const GET = handle(async (req: NextRequest) => {
  const scope = parseReportScope(req.nextUrl.searchParams);
  const report = await getReport(scope);
  const monthLabels = report.months.map(formatMonthLabel);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chi tiêu cá nhân';

  // Sheet 1: tổng hợp theo tháng
  const s1 = wb.addWorksheet('Theo tháng', { views: [{ state: 'frozen', ySplit: 1 }] });
  s1.columns = [
    { header: 'Tháng', key: 'month', width: 12 },
    { header: 'Tổng thu', key: 'income', width: 16, style: { numFmt: MONEY_FMT } },
    { header: 'Tổng chi', key: 'expense', width: 16, style: { numFmt: MONEY_FMT } },
    { header: 'Chênh lệch', key: 'net', width: 16, style: { numFmt: MONEY_FMT } },
    { header: 'Tỷ lệ tiết kiệm', key: 'rate', width: 16, style: { numFmt: '0.0%' } },
    { header: 'Thu cùng kỳ năm trước', key: 'pyIncome', width: 22, style: { numFmt: MONEY_FMT } },
    { header: 'Chi cùng kỳ năm trước', key: 'pyExpense', width: 22, style: { numFmt: MONEY_FMT } },
  ];
  styleHeader(s1.getRow(1));
  for (const m of report.monthly) {
    s1.addRow({
      month: formatMonthLabel(m.month),
      income: m.income,
      expense: m.expense,
      net: m.net,
      rate: m.savingsRate,
      pyIncome: m.prevYearIncome,
      pyExpense: m.prevYearExpense,
    });
  }
  styleBody(s1);
  styleTotal(
    s1.addRow({
      month: 'Tổng',
      income: report.summary.income,
      expense: report.summary.expense,
      net: report.summary.net,
      rate: report.summary.savingsRate,
    })
  );

  // Sheet 2 & 3: ma trận danh mục × tháng
  const matrixSheet = (title: string, rows: typeof report.expenseRows) => {
    const ws = wb.addWorksheet(title, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
    ws.columns = [
      { header: 'Danh mục', key: 'name', width: 24 },
      ...monthLabels.map((label, i) => ({ header: label, key: `m${i}`, width: 14, style: { numFmt: MONEY_FMT } })),
      { header: 'Tổng', key: 'total', width: 16, style: { numFmt: MONEY_FMT } },
      { header: 'TB / tháng', key: 'avg', width: 14, style: { numFmt: MONEY_FMT } },
    ];
    styleHeader(ws.getRow(1));
    for (const r of rows) {
      ws.addRow({
        name: r.name,
        ...Object.fromEntries(r.values.map((v, i) => [`m${i}`, v])),
        total: r.total,
        avg: Math.round(r.average),
      });
    }
    styleBody(ws);
    const colTotals = report.months.map((_, i) => rows.reduce((s, r) => s + r.values[i], 0));
    const grand = colTotals.reduce((s, v) => s + v, 0);
    styleTotal(
      ws.addRow({
        name: 'Tổng',
        ...Object.fromEntries(colTotals.map((v, i) => [`m${i}`, v])),
        total: grand,
        avg: Math.round(report.months.length ? grand / report.months.length : 0),
      })
    );
  };
  matrixSheet('Chi theo danh mục', report.expenseRows);
  matrixSheet('Thu theo danh mục', report.incomeRows);

  return xlsxResponse(wb, `thong-ke_${scope.fromMonth}_${scope.toMonth}.xlsx`);
});
