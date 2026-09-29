import { createHash } from 'node:crypto';
import { norm, parseMoney, parseVNDate } from '../tokens';
import { toVNDateString } from '../../dates';
import type { BankEmailProvider, EmailMeta, EmailParseResult } from '../types';

// ACB: email từ mailalert@acb.com.vn, viết dạng câu văn (không có bảng):
//   "ACB trân trọng thông báo tài khoản 12345678 của Quý khách đã thay đổi số dư như sau:
//    Số dư mới của tài khoản trên là: 2,000.00 VND tính đến 29/09/2026.
//    Giao dịch mới nhất:Ghi nợ -2,000.00 VND.
//    Nội dung giao dịch: ...."
// Ghi nợ = tiền ra, Ghi có = tiền vào. Có số dư sau giao dịch nhưng KHÔNG có giờ và mã giao dịch:
// giờ lấy theo thời điểm gửi email, chống trùng bằng mã băm các thông tin trong email.

const V = 'a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';

const RE = {
  account: new RegExp(`t[${V}]i\\s+kho[${V}]n\\s+(\\d{4,})`, 'iu'),
  balance: new RegExp(`s[${V}]\\s+d[${V}]\\s+m[${V}]i[^:]*:\\s*([\\d.,]+)\\s*VND\\s*t[${V}]nh\\s+[${V}]{2,3}n\\s+(\\d{1,2}\\/\\d{1,2}\\/\\d{4})`, 'iu'),
  txn: new RegExp(`giao\\s+d[${V}]ch\\s+m[${V}]i\\s+nh[${V}]t\\s*:\\s*(ghi\\s+n[${V}]|ghi\\s+c[${V}])?\\s*([+\\-−]?\\s*[\\d.,]+)\\s*VND`, 'iu'),
  content: new RegExp(`n[${V}]i\\s+dung\\s+giao\\s+d[${V}]ch\\s*:\\s*(.+)`, 'iu'),
};

const DAY_MS = 24 * 3600 * 1000;

function parse(tokens: string[], meta: EmailMeta): EmailParseResult {
  const text = tokens.join('\n').normalize('NFC');

  const account = text.match(RE.account)?.[1];
  if (!account) return { ok: false, reason: 'Không tìm thấy số tài khoản' };
  const txn = text.match(RE.txn);
  if (!txn) return { ok: false, reason: 'Không đọc được "Giao dịch mới nhất"' };
  const money = parseMoney(txn[2].replace(/\s+/g, ''));
  if (!money?.value) return { ok: false, reason: 'Không đọc được số tiền giao dịch' };

  // Chiều: theo "Ghi nợ / Ghi có", không có thì theo dấu số tiền
  const kind = txn[1] ? norm(txn[1]) : '';
  const direction: 'IN' | 'OUT' = kind === 'GHI CO' ? 'IN' : kind === 'GHI NO' ? 'OUT' : money.sign > 0 ? 'IN' : 'OUT';

  const bal = text.match(RE.balance);
  const balanceAfter = bal ? parseMoney(bal[1])?.value ?? null : null;
  const dateStr = bal?.[2] ?? null;
  const dayStart = dateStr ? parseVNDate(dateStr) : null;
  if (!dayStart && !meta.receivedAt) return { ok: false, reason: 'Không đọc được ngày giao dịch' };

  // Giờ giao dịch: thời điểm gửi email nếu cùng ngày (hoặc sát nửa đêm hôm sau); không có thì
  // hôm nay → bây giờ, ngày khác → 12:00 trưa ngày đó.
  let transactionDate: Date;
  const r = meta.receivedAt;
  if (r && (!dayStart || (r.getTime() >= dayStart.getTime() && r.getTime() < dayStart.getTime() + 1.25 * DAY_MS))) {
    transactionDate = r;
  } else if (dayStart && toVNDateString(dayStart) === toVNDateString(new Date())) {
    transactionDate = new Date();
  } else {
    transactionDate = new Date(dayStart!.getTime() + 12 * 3600 * 1000);
  }

  const details = (text.match(RE.content)?.[1] ?? '').split('\n')[0].replace(/\s*\.\s*$/, '').trim();

  // Không có mã giao dịch → băm các thông tin cố định trong email (không gồm giờ gửi)
  const key = [account, dateStr ?? toVNDateString(transactionDate), direction, money.value, balanceAfter ?? '', norm(details)].join('|');
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 16);

  return {
    ok: true,
    data: {
      provider: 'acb',
      bankName: 'ACB',
      externalId: `acb-email:${hash}`,
      referenceCode: hash,
      accountNumber: account,
      direction,
      amount: money.value,
      fee: 0,
      transactionDate,
      ownerName: null,
      counterpartyName: null,
      counterpartyAccount: null,
      counterpartyBank: null,
      details,
      kind: txn[1]?.trim() ?? null,
      balanceAfter,
    },
  };
}

export const acbProvider: BankEmailProvider = {
  id: 'acb',
  bankName: 'ACB',
  description: 'Email "ACB trân trọng thông báo tài khoản … đã thay đổi số dư" gửi cho mỗi biến động, kèm số dư mới.',
  covers: { out: true, in: true },
  reportsBalance: true,
  fromFilter: () => process.env.ACB_EMAIL_FROM || 'acb.com.vn',
  detect: (tokens, from) =>
    (!!from && from.toLowerCase().includes(acbProvider.fromFilter().toLowerCase())) ||
    tokens.some((t) => norm(t).includes('ACB TRAN TRONG THONG BAO')),
  parse,
};
