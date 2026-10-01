'use client';

import type { Direction } from '@/types/common';
import type { CategoryDTO } from '@/modules/categories/types';

interface Props {
  categories: CategoryDTO[];
  value: number | null;
  onChange: (id: number | null) => void;
  // Chỉ hiện danh mục khớp chiều thu/chi của giao dịch
  direction?: Direction;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function CategorySelect({
  categories,
  value,
  onChange,
  direction,
  placeholder = 'Chưa phân loại',
  className = 'select-field',
  disabled,
  ariaLabel = 'Danh mục',
}: Props) {
  const groups: { kind: CategoryDTO['kind']; label: string }[] = direction
    ? [{ kind: direction === 'IN' ? 'INCOME' : 'EXPENSE', label: direction === 'IN' ? 'Thu' : 'Chi' }]
    : [
        { kind: 'EXPENSE', label: 'Chi' },
        { kind: 'INCOME', label: 'Thu' },
      ];
  return (
    <select
      aria-label={ariaLabel}
      className={className}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{placeholder}</option>
      {groups.map((g) => (
        <optgroup key={g.kind} label={g.label}>
          {categories
            .filter((c) => c.kind === g.kind)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
