import { CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react';

// Trạng thái ngân sách: màu trạng thái luôn đi kèm icon + nhãn.
export function budgetLevel(percent: number | null) {
  if (percent === null) return null;
  if (percent >= 1) return { key: 'over', label: 'Vượt ngân sách', color: '#d03b3b', Icon: OctagonAlert } as const;
  if (percent >= 0.8) return { key: 'near', label: 'Sắp hết', color: '#ec835a', Icon: TriangleAlert } as const;
  return { key: 'ok', label: 'Trong hạn mức', color: '#0ca30c', Icon: CircleCheck } as const;
}

export function BudgetBar({ percent }: { percent: number | null }) {
  const level = budgetLevel(percent);
  const width = Math.min(100, Math.max(0, (percent ?? 0) * 100));
  return (
    <div
      className="h-2 rounded-full bg-slate-100 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round((percent ?? 0) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: level?.color ?? '#cbd5e1' }} />
    </div>
  );
}

export function BudgetBadge({ percent }: { percent: number | null }) {
  const level = budgetLevel(percent);
  if (!level) return null;
  const { Icon } = level;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: level.key === 'ok' ? '#006300' : level.color }}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {level.label}
    </span>
  );
}
