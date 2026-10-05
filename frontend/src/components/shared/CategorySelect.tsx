'use client';

import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import type { CategoryKind, Direction } from '@/types/common';
import type { CategoryDTO } from '@/modules/finance/categories/types';
import { buildCategoryTree } from '@/modules/finance/categories/utils/tree';
import CategoryIcon from './CategoryIcon';
import TreeSelect, { type TreeOption } from './TreeSelect';

export interface CategoryKindGroup {
  kind: CategoryKind;
  label: string;
}

interface OptionsOpts {
  // Chỉ lấy các danh mục thỏa điều kiện (mặc định: tất cả)
  pick?: (id: number) => boolean;
  // Đổi nhãn nhóm (VD thêm "★ Gợi ý cho VCB")
  groupLabel?: (label: string) => string;
}

// Dựng danh sách lựa chọn cho TreeSelect theo cây 2 cấp: cha (depth 0) rồi các con (depth 1), gom theo loại Chi/Thu
export function categoryOptions(categories: CategoryDTO[], groups: CategoryKindGroup[], opts: OptionsOpts = {}): TreeOption<number>[] {
  const pick = opts.pick ?? (() => true);
  const out: TreeOption<number>[] = [];
  for (const g of groups) {
    const group = opts.groupLabel ? opts.groupLabel(g.label) : g.label;
    for (const { cat, children } of buildCategoryTree(categories, g.kind)) {
      const kids = children.filter((ch) => pick(ch.id));
      if (!pick(cat.id) && !kids.length) continue;
      if (pick(cat.id)) {
        out.push({ value: cat.id, label: cat.name, depth: 0, group, icon: <CategoryIcon icon={cat.icon} color={cat.color} size="sm" /> });
      }
      for (const ch of kids) {
        out.push({
          value: ch.id,
          label: ch.name,
          depth: 1,
          group,
          icon: <CategoryIcon icon={ch.icon} color={ch.color} size="sm" />,
          keywords: `${cat.name} ${ch.name}`,
        });
      }
    }
  }
  return out;
}

interface Props {
  categories: CategoryDTO[];
  value: number | null;
  onChange: (id: number | null) => void;
  // Chỉ hiện danh mục khớp chiều thu/chi của giao dịch
  direction?: Direction;
  // Danh mục ưu tiên (VD theo nhóm đã gán cho tài khoản): hiện thành nhóm đầu tiên, phần còn lại xếp dưới
  suggested?: { label: string; ids: Set<number> };
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  // Cho phép bấm × để về "chưa phân loại" (mặc định: có)
  clearable?: boolean;
}

// Chọn danh mục theo cây 2 cấp (dropdown tùy chỉnh có icon, tìm kiếm). Giá trị null = chưa phân loại.
export default function CategorySelect({
  categories,
  value,
  onChange,
  direction,
  suggested,
  placeholder = 'Chưa phân loại',
  className = '',
  disabled,
  ariaLabel = 'Danh mục',
  size = 'md',
  clearable = true,
}: Props) {
  const groups: CategoryKindGroup[] = useMemo(
    () =>
      direction
        ? [{ kind: direction === 'IN' ? 'INCOME' : 'EXPENSE', label: direction === 'IN' ? 'Thu' : 'Chi' }]
        : [
            { kind: 'EXPENSE', label: 'Chi' },
            { kind: 'INCOME', label: 'Thu' },
          ],
    [direction],
  );

  const options = useMemo(() => {
    const ids = suggested?.ids;
    if (!ids || ids.size === 0) return categoryOptions(categories, groups);
    const multi = groups.length > 1;
    return [
      ...categoryOptions(categories, groups, {
        pick: (id) => ids.has(id),
        groupLabel: (l) => `★ ${suggested!.label}${multi ? ` · ${l}` : ''}`,
      }),
      ...categoryOptions(categories, groups, {
        pick: (id) => !ids.has(id),
        groupLabel: (l) => `${l} — danh mục khác`,
      }),
    ];
  }, [categories, groups, suggested]);

  return (
    <TreeSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      placeholderIcon={<Tag className="w-4 h-4 text-slate-400" aria-hidden />}
      clearable={clearable}
      size={size}
      disabled={disabled}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}
