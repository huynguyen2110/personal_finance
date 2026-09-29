// Kết quả đọc một email thông báo giao dịch — chung cho mọi ngân hàng.
export interface ParsedBankEmail {
  provider: string; // 'vcb' | 'cake' …
  bankName: string; // tên hiển thị khi tự tạo tài khoản
  externalId: string; // khóa chống trùng, VD "vcb-email:<số lệnh>"
  referenceCode: string;
  accountNumber: string; // tài khoản của bạn
  direction: 'IN' | 'OUT';
  amount: number;
  fee: number;
  transactionDate: Date;
  ownerName: string | null; // tên chủ tài khoản (để nhận diện chuyển cho chính mình)
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  counterpartyBank: string | null;
  details: string; // nội dung chuyển khoản
  kind: string | null; // loại giao dịch / tiêu đề biên lai
  balanceAfter: number | null; // số dư sau giao dịch, nếu ngân hàng có báo (VD ACB)
}

export interface EmailMeta {
  // Thời điểm email được gửi (header Date) — dùng khi email không ghi giờ giao dịch
  receivedAt: Date | null;
}

export type EmailParseResult = { ok: true; data: ParsedBankEmail } | { ok: false; reason: string };

export interface BankEmailProvider {
  id: string;
  bankName: string;
  // Mô tả ngắn cho giao diện: email nào, ghi nhận được gì
  description: string;
  covers: { out: boolean; in: boolean };
  reportsBalance: boolean; // email có báo số dư sau giao dịch
  // Chuỗi con của địa chỉ gửi (lọc khi tìm thư qua IMAP)
  fromFilter: () => string;
  // Nhận ra email của ngân hàng này (theo người gửi hoặc nội dung)
  detect: (tokens: string[], from: string | null) => boolean;
  parse: (tokens: string[], meta: EmailMeta) => EmailParseResult;
}
