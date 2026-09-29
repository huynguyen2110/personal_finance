// DTO trả về từ API (tiền đã đổi sang number, ngày là chuỗi ISO)
export type Direction = 'IN' | 'OUT';
export type CategoryKind = 'EXPENSE' | 'INCOME';

export interface CategoryDTO {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  _count?: { transactions: number; rules: number };
}

export interface RuleDTO {
  id: number;
  pattern: string;
  matchType: 'CONTAINS' | 'REGEX';
  categoryId: number;
  priority: number;
  isActive: boolean;
  category: Pick<CategoryDTO, 'id' | 'name' | 'icon' | 'color' | 'kind'>;
}

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
}

export interface TransactionDTO {
  id: number;
  accountId: number;
  account: { id: number; name: string; type: 'BANK' | 'CASH' };
  externalId: string | null;
  source: 'EMAIL' | 'MANUAL' | 'IMPORT';
  direction: Direction;
  amount: number;
  content: string;
  referenceCode: string | null;
  transactionDate: string;
  categoryId: number | null;
  category: Pick<CategoryDTO, 'id' | 'name' | 'icon' | 'color' | 'kind'> | null;
  categorizedBy: 'RULE' | 'MANUAL' | 'NONE';
  note: string | null;
  excludeFromStats: boolean;
  // Chuyển khoản nội bộ: giao dịch đối ứng ở tài khoản kia
  transferPairId: number | null;
  transferPair: { id: number; transactionDate: string; account: { id: number; name: string } } | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  sumIn: number;
  sumOut: number;
}
