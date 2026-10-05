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
  // Nhóm (tầng trên danh mục cha); chỉ danh mục cấp cao nhất có, con đi theo cha
  groupId: number | null;
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
  groupId?: number | null;
}

// Nhóm chi tiêu / thu nhập: gom nhiều danh mục cha, gán cho tài khoản thường chi cho nhóm đó
export interface CategoryGroupDTO {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  sortOrder: number;
  // Danh mục nhận giao dịch khi tài khoản chỉ gán nhóm này và không quy tắc nào khớp
  defaultCategoryId: number | null;
  categoryIds: number[];
  accountIds: number[];
}

export interface CategoryGroupInput {
  name?: string;
  kind?: CategoryKind;
  icon?: string;
  color?: string;
  sortOrder?: number;
  defaultCategoryId?: number | null;
  categoryIds?: number[];
  accountIds?: number[];
}
