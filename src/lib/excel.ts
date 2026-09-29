import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

export const MONEY_FMT = '#,##0';
export const DATETIME_FMT = 'dd/mm/yyyy hh:mm';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

// Excel không có múi giờ: dời về giờ VN để ô hiển thị đúng giờ địa phương.
export function toExcelVNDate(d: Date): Date {
  return new Date(d.getTime() + 7 * 3600 * 1000);
}

export function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.border = thinBorder;
  });
}

export function styleBody(ws: ExcelJS.Worksheet, fromRow = 2) {
  for (let r = fromRow; r <= ws.rowCount; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.border = thinBorder;
    });
  }
}

export function styleTotal(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = thinBorder;
  });
}

export async function xlsxResponse(wb: ExcelJS.Workbook, filename: string): Promise<NextResponse> {
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
