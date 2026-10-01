import type { CategoryKind } from '@/types/common';

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

export type CategoryRef = Pick<CategoryDTO, 'id' | 'name' | 'icon' | 'color' | 'kind'>;

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
  sortOrder?: number;
}
