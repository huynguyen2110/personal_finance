import type { Direction } from '@/types/common';
import type { CategoryRef } from '@/modules/categories/types';

export type MatchType = 'CONTAINS' | 'REGEX';

export interface RuleDTO {
  id: number;
  pattern: string;
  matchType: MatchType;
  categoryId: number;
  priority: number;
  isActive: boolean;
  category: CategoryRef;
}

export interface RuleInput {
  pattern?: string;
  matchType?: MatchType;
  categoryId?: number;
  priority?: number;
  isActive?: boolean;
}

export interface RuleTestResult {
  normalized: string;
  rule: { id: number; pattern: string; matchType: MatchType } | null;
  category: CategoryRef | null;
}

export interface RuleTestInput {
  content: string;
  direction: Direction;
}
