'use client';

import TreeSelect, { type TreeOption, type TreeSelectProps } from '@/components/shared/TreeSelect';
import { cn } from '@/modules/mindmap/lib/utils';

export type { TreeOption as GOption };

/**
 * Dropdown của module Phát triển bản thân: TreeSelect dùng chung (popup tùy chỉnh, nhóm, cây 2 cấp,
 * tìm kiếm, phím tắt) với tông tím. `soft` = nền tím nhạt không viền (mặc định), `pill` = nút tròn nhỏ,
 * `auto` = rộng theo nội dung thay vì 100%.
 */
export function GSelect<V extends string | number>({
  soft = true,
  pill = false,
  auto = false,
  className,
  searchPlaceholder = 'Tìm…',
  ...props
}: TreeSelectProps<V> & { soft?: boolean; pill?: boolean; auto?: boolean }) {
  return (
    <TreeSelect
      {...props}
      searchPlaceholder={searchPlaceholder}
      panelClassName="tsel-violet"
      className={cn('tsel-violet', soft && 'tsel-soft', pill && 'tsel-pill', auto && 'tsel-auto', className)}
    />
  );
}

/** Chấm màu nhỏ làm icon cho lựa chọn. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  );
}
