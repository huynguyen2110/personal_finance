export interface AccountDTO {
  id: number;
  type: 'BANK' | 'CASH';
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  openingBalance: number;
  balance: number;
  // BANK: số dư ngân hàng báo gần nhất (+ giao dịch sau đó); COMPUTED: số dư đầu kỳ + thu − chi
  balanceSource: 'BANK' | 'COMPUTED';
  bankBalance: number | null;
  bankBalanceAt: string | null;
  // Web ghi nhận giao dịch của tài khoản này bằng cách nào, có đủ cả tiền vào/ra không
  tracking: { method: 'EMAIL' | 'MANUAL'; label: string; in: boolean; out: boolean };
  isActive: boolean;
  transactionCount: number;
  // Nhóm chi tiêu / thu nhập tài khoản này thường dùng
  groupIds: number[];
}

export interface AccountInput {
  type?: 'BANK' | 'CASH';
  name?: string;
  bankName?: string | null;
  accountNumber?: string | null;
  openingBalance?: number;
  isActive?: boolean;
  groupIds?: number[];
}
