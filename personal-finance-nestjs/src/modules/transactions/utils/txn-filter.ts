import type { Prisma } from '@prisma/client';
import { endOfVNDayExclusive, isValidDateStr, startOfVNDay } from '../../../common/utils/dates.util';
import { normalizeText } from '../../../common/utils/text.util';

// Bộ lọc giao dịch dùng chung cho danh sách, xuất Excel.
// Query params: from, to (YYYY-MM-DD), accountId, direction (IN|OUT), categoryId (số | "none"),
// q (tìm trong nội dung/ghi chú), min, max (số tiền), source, excluded ("1" chỉ lấy giao dịch bị loại),
// transfer ("1" chỉ lấy chuyển khoản nội bộ đã ghép cặp)
export function buildTxnWhere(sp: URLSearchParams): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [];

  const from = sp.get('from');
  const to = sp.get('to');
  if (isValidDateStr(from)) and.push({ transactionDate: { gte: startOfVNDay(from) } });
  if (isValidDateStr(to)) and.push({ transactionDate: { lt: endOfVNDayExclusive(to) } });

  const accountId = Number(sp.get('accountId'));
  if (Number.isInteger(accountId) && accountId > 0) and.push({ accountId });

  const direction = sp.get('direction');
  if (direction === 'IN' || direction === 'OUT') and.push({ direction });

  const categoryId = sp.get('categoryId');
  if (categoryId === 'none') and.push({ categoryId: null });
  else if (categoryId && Number(categoryId) > 0) {
    // Lọc theo danh mục cha thì lấy luôn giao dịch của các danh mục con
    const id = Number(categoryId);
    and.push({ OR: [{ categoryId: id }, { category: { parentId: id } }] });
  }

  const source = sp.get('source');
  if (source === 'EMAIL' || source === 'MANUAL' || source === 'IMPORT') and.push({ source });

  // Cách giao dịch được phân loại: RULE (quy tắc) | MANUAL (người dùng chọn) | NONE (chưa phân loại) | ACCOUNT (theo nhóm của tài khoản)
  const categorizedBy = sp.get('categorizedBy');
  if (categorizedBy === 'RULE' || categorizedBy === 'MANUAL' || categorizedBy === 'NONE' || categorizedBy === 'ACCOUNT') and.push({ categorizedBy });

  if (sp.get('excluded') === '1') and.push({ excludeFromStats: true });
  if (sp.get('transfer') === '1') and.push({ transferPairId: { not: null } });

  const min = Number(sp.get('min'));
  if (sp.get('min') && Number.isFinite(min)) and.push({ amount: { gte: BigInt(Math.round(min)) } });
  const max = Number(sp.get('max'));
  if (sp.get('max') && Number.isFinite(max)) and.push({ amount: { lte: BigInt(Math.round(max)) } });

  const q = sp.get('q')?.trim();
  if (q) {
    // PostgreSQL phân biệt hoa thường → mode insensitive; tìm thêm bản bỏ dấu để khớp nội dung CK thường không dấu.
    const plain = normalizeText(q);
    const ci = (v: string) => ({ contains: v, mode: 'insensitive' as const });
    and.push({
      OR: [{ content: ci(q) }, { content: ci(plain) }, { note: ci(q) }, { referenceCode: ci(q) }],
    });
  }

  return and.length ? { AND: and } : {};
}
