import { digitsOnly, labelReader, norm, parseVNDate } from '../tokens';
import type { BankEmailProvider, EmailParseResult } from '../types';

// Cake by VPBank: email "Cake xin thông báo tài khoản của bạn vừa mới phát sinh giao dịch".
// Số tiền có dấu: "-65.000 đ" là tiền ra, "+…" là tiền vào. Tài khoản của bạn có hậu tố
// " - Tài khoản thanh toán" (VD "0123456789 - Tài khoản thanh toán").
const L = {
  from: ['TAI KHOAN CHUYEN'],
  to: ['TAI KHOAN NHAN'],
  toName: ['TEN NGUOI NHAN'],
  toBank: ['NGAN HANG NHAN'],
  fromName: ['TEN NGUOI CHUYEN'],
  fromBank: ['NGAN HANG CHUYEN'],
  kind: ['LOAI GIAO DICH'],
  code: ['MA GIAO DICH'],
  date: ['NGAY GIO GIAO DICH', 'THOI GIAN GIAO DICH'],
  amount: ['SO TIEN', 'SO TIEN GIAO DICH'],
  fee: ['PHI GIAO DICH'],
  details: ['NOI DUNG GIAO DICH', 'NOI DUNG'],
  sections: ['THONG TIN TAI KHOAN', 'THONG TIN GIAO DICH'],
} as const;
const ALL = Object.values(L).flat();

const OWN_SUFFIX = /-\s*T[àa]i kho[ảa]n\b/i;

// "0123456789 - Tài khoản thanh toán" → "0123456789"; "PMC2603…" (ví MoMo) → giữ nguyên
function accountOf(v: string | null): string | null {
  if (!v) return null;
  const head = v.split(/\s+-\s+/)[0].trim();
  return /^\d[\d\s]*$/.test(head) ? digitsOnly(head) : head || null;
}

function parse(tokens: string[]): EmailParseResult {
  const r = labelReader(tokens, ALL);

  const code = (r.value(L.code) ?? '').trim();
  if (!code) return { ok: false, reason: 'Không tìm thấy "Mã giao dịch"' };
  const dateRaw = r.value(L.date);
  const transactionDate = dateRaw ? parseVNDate(dateRaw) : null;
  if (!transactionDate) return { ok: false, reason: 'Không đọc được "Ngày giờ giao dịch"' };
  const money = r.money(L.amount, 3);
  if (!money?.value) return { ok: false, reason: 'Không đọc được "Số tiền"' };

  const fromRaw = r.value(L.from);
  const toRaw = r.value(L.to);
  // Chiều giao dịch: theo dấu số tiền; không có dấu thì theo ô nào là tài khoản của bạn
  let direction: 'IN' | 'OUT';
  if (money.sign !== 0) direction = money.sign < 0 ? 'OUT' : 'IN';
  else if (toRaw && OWN_SUFFIX.test(toRaw) && !(fromRaw && OWN_SUFFIX.test(fromRaw))) direction = 'IN';
  else direction = 'OUT';

  const own = accountOf(direction === 'OUT' ? fromRaw : toRaw);
  if (!own) return { ok: false, reason: 'Không tìm thấy số tài khoản Cake của bạn' };

  // "Chào Nguyễn Văn A" → tên chủ tài khoản
  const greeting = tokens.find((t) => /^ch[àa]o\s+/i.test(t));
  const ownerName = greeting ? greeting.replace(/^ch[àa]o\s+/i, '').replace(/[,!.]+$/, '').trim() || null : null;

  const counterparty =
    direction === 'OUT'
      ? { name: r.value(L.toName), account: accountOf(toRaw), bank: r.value(L.toBank) }
      : { name: r.value(L.fromName), account: accountOf(fromRaw), bank: r.value(L.fromBank) };

  return {
    ok: true,
    data: {
      provider: 'cake',
      bankName: 'Cake',
      externalId: `cake-email:${code}`,
      referenceCode: code,
      accountNumber: own,
      direction,
      amount: money.value,
      fee: r.money(L.fee, 3)?.value ?? 0,
      transactionDate,
      ownerName,
      counterpartyName: counterparty.name,
      counterpartyAccount: counterparty.account,
      counterpartyBank: counterparty.bank,
      details: r.value(L.details) ?? '',
      kind: r.value(L.kind),
      balanceAfter: null,
    },
  };
}

export const cakeProvider: BankEmailProvider = {
  id: 'cake',
  bankName: 'Cake',
  description: 'Email "Cake xin thông báo … vừa mới phát sinh giao dịch" gửi cho mỗi biến động.',
  covers: { out: true, in: true },
  reportsBalance: false,
  fromFilter: () => process.env.CAKE_EMAIL_FROM || 'cake.vn',
  detect: (tokens, from) =>
    (!!from && from.toLowerCase().includes(cakeProvider.fromFilter().toLowerCase())) ||
    tokens.some((t) => norm(t).includes('CAKE XIN THONG BAO')),
  parse,
};
