import CategoryIcon from './CategoryIcon';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';
import type { TransactionDTO } from '@/modules/transactions/types';

// Danh sách giao dịch gọn (dùng ở Tổng quan)
export default function TxnMiniList({ items, empty = 'Chưa có giao dịch' }: { items: TransactionDTO[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-text-muted py-6 text-center">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2.5">
          <CategoryIcon icon={t.category?.icon} color={t.category?.color} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text truncate" title={t.content}>
              {t.content || '(không có nội dung)'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {formatVNDateTime(t.transactionDate)} · {t.category?.name ?? 'Chưa phân loại'}
            </p>
          </div>
          <span
            className={`text-sm font-semibold tabular whitespace-nowrap ${t.direction === 'IN' ? 'text-[#005c55]' : 'text-text'}`}
          >
            {t.direction === 'IN' ? '+' : '−'}
            {formatVND(t.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
