import type { CategoryKind } from '@/types/common';

export interface CategoryDTO {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  // Danh mục 2 cấp: con trỏ về cha cùng loại; null = cấp cao nhất
  parentId: number | null;
  _count?: { transactions: number; rules: number; children: number };
}

export type CategoryRef = Pick<CategoryDTO, 'id' | 'name' | 'icon' | 'color' | 'kind'>;

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
  sortOrder?: number;
  parentId?: number | null;
}
