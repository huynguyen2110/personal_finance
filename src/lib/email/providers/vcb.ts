import { digitsOnly, labelReader, norm, parseVNDate } from '../tokens';
import type { BankEmailProvider, EmailParseResult } from '../types';

// Vietcombank: email "Biên lai chuyển tiền" (Payment Receipt) gửi khi bạn chuyển đi từ VCB Digibank.
// Mỗi nhãn tiếng Việt đi kèm nhãn tiếng Anh ngay sau, rồi mới tới giá trị. Chỉ có tiền RA.
const L = {
  date: ['NGAY, GIO GIAO DICH', 'NGAY GIO GIAO DICH', 'TRANS. DATE, TIME', 'TRANS. DATE'],
  order: ['SO LENH GIAO DICH', 'ORDER NUMBER', 'SO THAM CHIEU'],
  debit: ['TAI KHOAN NGUON', 'DEBIT ACCOUNT'],
  remitter: ['TEN NGUOI CHUYEN TIEN', "REMITTER'S NAME", 'REMITTER NAME'],
  credit: ['TAI KHOAN NGUOI HUONG', 'CREDIT ACCOUNT', 'SO TAI KHOAN NGUOI HUONG'],
  beneficiary: ['TEN NGUOI HUONG', 'BENEFICIARY NAME', "BENEFICIARY'S NAME"],
  bank: ['TEN NGAN HANG HUONG', 'BENEFICIARY BANK NAME', 'NGAN HANG HUONG'],
  amount: ['SO TIEN', 'AMOUNT'],
  // "Số tiền phí" (Charge Amount) = tổng phí người chuyển trả (Net income + VAT)
  fee: ['SO TIEN PHI', 'CHARGE AMOUNT'],
  other: ['VAT', 'NET INCOME', 'LOAI PHI', 'CHARGE CODE'],
  details: ['NOI DUNG CHUYEN TIEN', 'DETAILS OF PAYMENT', 'NOI DUNG'],
} as const;
const ALL = Object.values(L).flat();

function parse(tokens: string[]): EmailParseResult {
  const r = labelReader(tokens, ALL);
  const title = tokens.find((t) => norm(t).startsWith('BIEN LAI')) ?? null;

  const order = digitsOnly(r.value(L.order)) || (r.value(L.order) ?? '');
  if (!order) return { ok: false, reason: 'Không tìm thấy "Số lệnh giao dịch"' };
  const dateRaw = r.value(L.date);
  const transactionDate = dateRaw ? parseVNDate(dateRaw) : null;
  if (!transactionDate) return { ok: false, reason: 'Không đọc được "Ngày, giờ giao dịch"' };
  const debit = digitsOnly(r.value(L.debit));
  if (!debit) return { ok: false, reason: 'Không tìm thấy "Tài khoản nguồn"' };
  // Chỉ nhìn 2 ô sau nhãn "Số tiền" để không nhầm sang "Số tiền phí"
  const amount = r.money(L.amount, 3)?.value;
  if (!amount) return { ok: false, reason: 'Không đọc được "Số tiền"' };

  return {
    ok: true,
    data: {
      provider: 'vcb',
      bankName: 'Vietcombank',
      externalId: `vcb-email:${order}`,
      referenceCode: order,
      accountNumber: debit,
      direction: 'OUT',
      amount,
      fee: r.money(L.fee)?.value ?? 0,
      transactionDate,
      ownerName: r.value(L.remitter),
      counterpartyName: r.value(L.beneficiary),
      counterpartyAccount: digitsOnly(r.value(L.credit)) || null,
      counterpartyBank: r.value(L.bank),
      details: r.value(L.details) ?? '',
      kind: title,
      balanceAfter: null,
    },
  };
}

export const vcbProvider: BankEmailProvider = {
  id: 'vcb',
  bankName: 'Vietcombank',
  description: 'Email "Biên lai chuyển tiền" gửi mỗi khi bạn chuyển đi từ VCB Digibank.',
  covers: { out: true, in: false },
  reportsBalance: false,
  fromFilter: () => process.env.VCB_EMAIL_FROM || 'vietcombank',
  detect: (tokens, from) =>
    (!!from && from.toLowerCase().includes(vcbProvider.fromFilter().toLowerCase())) ||
    tokens.some((t) => {
      const n = norm(t);
      return n.startsWith('BIEN LAI') || n === 'ORDER NUMBER' || n === 'SO LENH GIAO DICH';
    }),
  parse,
};
