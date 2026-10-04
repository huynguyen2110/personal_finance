export interface EmailPollSummary {
  at: string;
  scanned: number;
  created: number;
  merged: number;
  duplicates: number;
  skipped: number;
  // Giao dịch trước "ngày bắt đầu lấy dữ liệu" → bỏ qua (có từ bản sau, bản ghi cũ có thể thiếu)
  beforeStart?: number;
  // Email tiền đến bị bỏ qua do cài đặt chỉ lấy tiền đi
  ignoredIncoming?: number;
  startDate?: string | null;
  incoming?: boolean;
  error?: string;
}

export interface EmailProviderInfo {
  id: string;
  bankName: string;
  description: string;
  covers: { in: boolean; out: boolean };
  reportsBalance: boolean;
  from: string;
}

export interface EmailStatus {
  configured: boolean;
  pollMinutes: number;
  // Ngày bắt đầu lấy dữ liệu từ email (Cài đặt); null = không giới hạn
  startDate: string | null;
  // Có lấy email tiền đến không (Cài đặt)
  incoming: boolean;
  lastRun: EmailPollSummary | null;
  providers: EmailProviderInfo[];
}

// Số giao dịch email có ngày trước ngày bắt đầu (để quyết định xóa)
export interface EmailBeforeStart {
  startDate: string | null;
  count: number;
  total: number;
}

export interface EmailPreview {
  bankName: string;
  referenceCode: string;
  transactionDate: string;
  accountTail: string;
  direction: 'IN' | 'OUT';
  amount: number;
  fee: number;
  content: string;
  selfTransfer: boolean;
  balanceAfter: number | null;
}

export interface EmailImportResult {
  preview: EmailPreview;
  result?: { status: 'created' | 'duplicate' | 'merged'; id: number; internal: boolean };
}
