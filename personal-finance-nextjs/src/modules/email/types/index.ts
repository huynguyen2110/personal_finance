export interface EmailPollSummary {
  at: string;
  scanned: number;
  created: number;
  merged: number;
  duplicates: number;
  skipped: number;
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
  lastRun: EmailPollSummary | null;
  providers: EmailProviderInfo[];
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
