import type { Direction } from '@/types/common';
import type { CategoryRef } from '@/modules/finance/categories/types';

export type MatchType = 'CONTAINS' | 'REGEX';

export interface RuleDTO {
  id: number;
  pattern: string;
  matchType: MatchType;
  categoryId: number;
  priority: number;
  isActive: boolean;
  // Chỉ áp dụng cho một tài khoản (null = mọi tài khoản)
  accountId: number | null;
  account: { id: number; name: string } | null;
  category: CategoryRef;
}

export interface RuleInput {
  pattern?: string;
  matchType?: MatchType;
  categoryId?: number;
  priority?: number;
  isActive?: boolean;
  accountId?: number | null;
}

export interface RuleTestResult {
  normalized: string;
  rule: { id: number; pattern: string; matchType: MatchType; accountId: number | null } | null;
  category: CategoryRef | null;
  categorizedBy: 'RULE' | 'ACCOUNT' | 'NONE';
}

export interface RuleTestInput {
  content: string;
  direction: Direction;
  accountId?: number;
}
