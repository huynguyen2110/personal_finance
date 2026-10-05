'use client';

import CategoryIcon from '@/components/shared/CategoryIcon';
import { formatVND } from '@/lib/money';

export interface CategoryDatum {
  categoryId: number | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
}

interface Props {
  data: CategoryDatum[];
  barColor: string;
  limit?: number;
  onSelect?: (categoryId: number | null) => void;
}

// Cơ cấu theo danh mục: thanh ngang một màu (so sánh độ lớn), chip icon mang nhận diện danh mục.
// Số liệu hiển thị trực tiếp nên không cần tooltip.
export default function CategoryBreakdown({ data, barColor, limit = 8, onSelect }: Props) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (!data.length || total === 0) {
    return <p className="text-sm text-text-muted py-8 text-center">Chưa có dữ liệu trong kỳ</p>;
  }
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  const rows: CategoryDatum[] = tail.length
    ? [
        ...head,
        {
          categoryId: -1,
          name: `Khác (${tail.length} danh mục)`,
          icon: 'Ellipsis',
          color: '#898781',
          total: tail.reduce((s, d) => s + d.total, 0),
          count: tail.reduce((s, d) => s + d.count, 0),
        },
      ]
    : head;
  const max = Math.max(...rows.map((r) => r.total));

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = r.total / total;
        const clickable = onSelect && r.categoryId !== -1;
        return (
          <li key={r.categoryId ?? 'none'}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(r.categoryId)}
              className={`w-full text-left rounded-lg px-1.5 py-1 -mx-1.5 ${clickable ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center gap-2.5">
                <CategoryIcon icon={r.icon} color={r.color} size="sm" />
                <span className="text-sm text-text truncate flex-1 min-w-0">{r.name}</span>
                <span className="text-sm font-medium text-text tabular">{formatVND(r.total)}</span>
                <span className="text-xs text-text-muted tabular w-11 text-right">
                  {(pct * 100).toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div className="mt-1.5 ml-[34px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(1.5, (r.total / max) * 100)}%`, backgroundColor: barColor }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
