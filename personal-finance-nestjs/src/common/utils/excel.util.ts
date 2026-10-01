import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import ExcelJS from 'exceljs';

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

// Trả file .xlsx cho controller (dùng kèm @Res({ passthrough: true })).
// TransformInterceptor không bọc envelope cho StreamableFile.
export async function xlsxFile(wb: ExcelJS.Workbook, filename: string, res: Response): Promise<StreamableFile> {
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  return new StreamableFile(buffer);
}
