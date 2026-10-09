import type { Direction } from '@/types/common';
import type { CategoryRef } from '@/modules/finance/categories/types';

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
  category: CategoryRef | null;
  // RULE: khớp quy tắc | MANUAL: tự chọn | NONE: chưa phân loại | ACCOUNT: theo nhóm duy nhất của tài khoản
  categorizedBy: 'RULE' | 'MANUAL' | 'NONE' | 'ACCOUNT';
  note: string | null;
  excludeFromStats: boolean;
  // Chuyển khoản nội bộ: giao dịch đối ứng ở tài khoản kia
  transferPairId: number | null;
  transferPair: { id: number; transactionDate: string; account: { id: number; name: string } } | null;
  // Khoản chuyển cho chính mình (tự nhận diện từ email): tài khoản bên kia lấy từ email gốc
  selfTransferTo?: SelfTransferTo | null;
}

// Một tài khoản của chính mình đã nhận tiền chuyển đi (Cài đặt → Chuyển cho chính bạn)
export interface SelfTransferAccount {
  accountNumber: string;
  name: string | null;
  bank: string | null;
  count: number; // số lần chuyển sang
  counted: number; // trong đó đang tính vào chi tiêu
  total: number;
  lastDate: string | null;
  alwaysSpend: boolean;
}

export interface SelfTransferTo {
  accountNumber: string;
  name: string | null;
  bank: string | null;
}

// Bộ lọc danh sách (query string) — khóa giống API
export type TransactionFilters = Partial<
  Record<'from' | 'to' | 'accountId' | 'direction' | 'categoryId' | 'categorizedBy' | 'q' | 'source' | 'excluded' | 'transfer' | 'min' | 'max' | 'sort', string>
>;

export interface TransactionInput {
  accountId?: number;
  direction?: Direction;
  amount?: number;
  content?: string;
  transactionDate?: string;
  categoryId?: number | null;
  note?: string | null;
  excludeFromStats?: boolean;
}

export interface BulkUpdateInput {
  ids: number[];
  categoryId?: number | null;
  excludeFromStats?: boolean;
}
