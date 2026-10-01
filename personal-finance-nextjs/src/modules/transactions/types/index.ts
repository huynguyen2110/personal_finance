import type { Direction } from '@/types/common';
import type { CategoryRef } from '@/modules/categories/types';

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
  categorizedBy: 'RULE' | 'MANUAL' | 'NONE';
  note: string | null;
  excludeFromStats: boolean;
  // Chuyển khoản nội bộ: giao dịch đối ứng ở tài khoản kia
  transferPairId: number | null;
  transferPair: { id: number; transactionDate: string; account: { id: number; name: string } } | null;
}

// Bộ lọc danh sách (query string) — khóa giống API
export type TransactionFilters = Partial<
  Record<'from' | 'to' | 'accountId' | 'direction' | 'categoryId' | 'q' | 'source' | 'excluded' | 'transfer' | 'min' | 'max' | 'sort', string>
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
