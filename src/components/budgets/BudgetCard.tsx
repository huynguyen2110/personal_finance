'use client';

import Link from 'next/link';
import { Circle, CircleCheck, CircleDashed, OctagonAlert, Pencil, Plus, TriangleAlert, type LucideIcon } from 'lucide-react';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { qs } from '@/lib/client';
import { formatCompactVND, formatVND } from '@/lib/money';
import { formatMonthLabel, monthRange } from '@/lib/dates';
import { budgetState, projectedSpend, type BudgetState, type MonthClock } from '@/lib/budgetInsights';
import type { BudgetLine } from '@/lib/budget';

// Màu trạng thái theo DESIGN.md: teal = trong tầm kiểm soát, amber = sắp chạm, rose = vượt.
// Luôn đi kèm icon + nhãn chữ, không dùng màu đơn thuần.
export const STATE_STYLE: Record<
  BudgetState,
  { stripe: string; fill: string; badge: string; text: string; Icon: LucideIcon }
> = {
  over: { stripe: 'bg-rose-500', fill: '#F43F5E', badge: 'bg-rose-50 text-rose-600 border-rose-200', text: 'text-rose-600', Icon: OctagonAlert },
  near: { stripe: 'bg-amber-500', fill: '#F59E0B', badge: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-700', Icon: TriangleAlert },
  ok: { stripe: 'bg-teal-700', fill: '#0F766E', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', Icon: CircleCheck },
  unused: { stripe: 'bg-slate-300', fill: '#0F766E', badge: 'bg-slate-100 text-slate-600 border-slate-200', text: 'text-slate-600', Icon: Circle },
  none: { stripe: 'bg-slate-200', fill: '#CBD5E1', badge: 'bg-slate-100 text-slate-500 border-slate-200', text: 'text-slate-500', Icon: CircleDashed },
};

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;

export function stateLabel(l: BudgetLine): string {
  const s = budgetState(l);
  if (s === 'none') return 'Chưa đặt hạn mức';
  if (s === 'unused') return 'Chưa tiêu';
  const p = l.percent ?? 0;
  if (s === 'over') return `Vượt ${pct(p)}`;
  if (s === 'near') return l.spent === l.amount ? 'Chạm 100%' : `Sắp chạm ${pct(p)}`;
  return pct(p);
}

// Thanh tiến độ 6px + vạch mốc thời gian của tháng
export function ProgressTrack({
  percent,
  fill,
  timePct,
  height = 'h-1.5',
  label,
}: {
  percent: number;
  fill: string;
  timePct: number | null;
  height?: string;
  label: string;
}) {
  const width = Math.min(100, Math.max(0, percent * 100));
  return (
    <div
      className={`relative w-full ${height} bg-slate-100 rounded-full overflow-hidden`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${width}%`, backgroundColor: fill }} />
      {timePct !== null && timePct > 0 && timePct < 1 && (
        <div className="absolute inset-y-0 w-0.5 bg-slate-900 z-10" style={{ left: `${timePct * 100}%` }} aria-hidden />
      )}
    </div>
  );
}

interface Props {
  line: BudgetLine;
  month: string;
  clock: MonthClock;
  onEdit: (line: BudgetLine) => void;
}

export default function BudgetCard({ line, month, clock, onEdit }: Props) {
  const state = budgetState(line);
  const st = STATE_STYLE[state];
  const { from, to } = monthRange(month);
  const amount = line.amount;
  const remaining = amount !== null ? amount - line.spent : null;
  const showMarker = clock.phase === 'current' ? clock.timePct : null;

  // Dòng giải thích dưới thanh tiến độ
  let pace: string;
  if (amount === null) pace = line.spent > 0 ? `Đã chi ${formatVND(line.spent)} nhưng chưa có hạn mức` : 'Chưa phát sinh chi tiêu, chưa có hạn mức';
  else if (clock.phase === 'future') pace = 'Tháng chưa bắt đầu';
  else if (clock.phase === 'past') pace = `Kết thúc tháng: dùng ${pct(line.percent ?? 0)} hạn mức`;
  else if (state === 'over') pace = `Đã vượt hạn mức ${formatVND(line.spent - amount)} (+${pct((line.percent ?? 0) - 1)})`;
  else if (state === 'unused') pace = 'Chưa phát sinh chi tiêu tháng này';
  else {
    const diff = (line.percent ?? 0) - clock.timePct;
    const projected = projectedSpend(line.spent, clock);
    pace =
      diff > 0.05
        ? `Tiêu nhanh hơn nhịp thời gian ${pct(diff)} · dự kiến cuối tháng ~${formatCompactVND(projected)}`
        : `Trong nhịp an toàn · dự kiến cuối tháng ~${formatCompactVND(projected)}`;
  }

  return (
    <div className="fin-card fin-card-hover relative overflow-hidden p-4 pl-5 flex flex-col gap-3">
      <span className={`absolute left-0 inset-y-0 w-1.5 ${st.stripe}`} aria-hidden />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CategoryIcon icon={line.icon} color={line.color} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/transactions${qs({ categoryId: line.categoryId, from, to, direction: 'OUT' })}`}
                className="text-[16px] leading-6 font-semibold tracking-[-0.01em] text-slate-900 hover:underline"
              >
                {line.name}
              </Link>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${st.badge}`}>
                <st.Icon className="w-3 h-3" aria-hidden />
                {stateLabel(line)}
              </span>
              {line.source && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  {line.source === 'MONTH' ? `Riêng ${formatMonthLabel(month)}` : 'Mặc định hàng tháng'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 fin-num">
              {line.count} giao dịch tháng này · tháng trước {formatVND(line.prevSpent)}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 fin-num">
          <p className="text-slate-900">
            <span className={`text-[20px] leading-7 font-semibold tracking-[-0.015em] ${state === 'over' ? 'text-rose-600' : ''}`}>
              {new Intl.NumberFormat('vi-VN').format(line.spent)}
            </span>
            <span className="text-xs text-slate-500"> / {amount !== null ? formatVND(amount) : '—'}</span>
          </p>
          {remaining !== null && (
            <p className={`text-xs font-semibold mt-0.5 ${remaining < 0 ? 'text-rose-600' : st.text}`}>
              {remaining < 0
                ? `Đã vượt: −${formatVND(-remaining)}`
                : clock.phase === 'current' && clock.daysLeft > 0
                  ? `Còn lại ${formatVND(remaining)} (~${formatCompactVND(remaining / clock.daysLeft)}/ngày)`
                  : `Còn lại ${formatVND(remaining)}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {amount !== null && (
          <ProgressTrack percent={line.percent ?? 0} fill={st.fill} timePct={showMarker} label={`${line.name}: đã dùng hạn mức`} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs fin-num ${state === 'over' ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>{pace}</span>
          {amount === null ? (
            <button type="button" className="fin-btn fin-btn-outline fin-btn-sm text-teal-700" onClick={() => onEdit(line)}>
              <Plus className="w-3.5 h-3.5" /> Đặt hạn mức
            </button>
          ) : state === 'over' ? (
            <button type="button" className="fin-btn fin-btn-outline fin-btn-sm text-teal-700" onClick={() => onEdit(line)}>
              <Plus className="w-3.5 h-3.5" /> Tăng hạn mức
            </button>
          ) : (
            <button type="button" className="fin-btn fin-btn-ghost fin-btn-sm" onClick={() => onEdit(line)} aria-label={`Sửa hạn mức ${line.name}`}>
              <Pencil className="w-3.5 h-3.5" /> Sửa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
