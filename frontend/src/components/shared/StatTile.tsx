import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  // So sánh với kỳ trước
  delta?: number | null; // tỷ lệ thay đổi, VD 0.12 = +12%
  // true: tăng là tốt (thu, tiết kiệm); false: tăng là xấu (chi)
  upIsGood?: boolean;
  hint?: string;
  accent?: string; // màu chấm nhận diện series
}

export default function StatTile({ label, value, delta, upIsGood = true, hint, accent }: Props) {
  let deltaEl: React.ReactNode = null;
  if (delta !== undefined && delta !== null && Number.isFinite(delta)) {
    const flat = Math.abs(delta) < 0.005;
    const up = delta > 0;
    const good = flat ? null : up === upIsGood;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    const color = good === null ? 'text-text-secondary' : good ? 'text-success' : 'text-danger';
    deltaEl = (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {flat ? '0%' : `${up ? '+' : ''}${(delta * 100).toFixed(1).replace('.', ',')}%`}
        <span className="text-text-muted font-normal ml-1">so với kỳ trước</span>
      </span>
    );
  }

  return (
    <div className="glass-card p-4 md:p-5 min-w-0">
      <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
        {accent && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden />}
        {label}
      </p>
      <p className="mt-2 text-xl md:text-2xl font-semibold text-text truncate" title={value}>
        {value}
      </p>
      <div className="mt-1.5 min-h-4">{deltaEl ?? (hint && <span className="text-xs text-text-muted">{hint}</span>)}</div>
    </div>
  );
}
