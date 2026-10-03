'use client';

import { Layers, Pencil, Plus } from 'lucide-react';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { formatCompactVND } from '@/lib/money';
import type { BudgetLine, GroupBudgetStatus } from '../types';
import { NEAR_THRESHOLD, type MonthClock } from '../utils/budget-insights';
import { ProgressTrack } from './BudgetCard';

interface Props {
  groups: GroupBudgetStatus[];
  lines: BudgetLine[];
  clock: MonthClock;
  onEdit: (g: GroupBudgetStatus) => void;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

// Hạn mức chung cho cả nhóm chi tiêu: hợp với khoản biến động theo tháng, chỉ cần kiểm soát tổng của nhóm
export default function GroupBudgetsSection({ groups, lines, clock, onEdit }: Props) {
  if (!groups.length) return null;
  const nameOf = (id: number) => lines.find((l) => l.categoryId === id)?.name;
  const withBudget = groups.filter((g) => g.amount !== null).length;

  return (
    <section className="fin-card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-teal-700">
            <Layers className="w-5 h-5" aria-hidden />
          </span>
          <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Hạn mức theo nhóm</h2>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold fin-num">
          {withBudget}/{groups.length} nhóm có hạn mức
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map((g) => {
          const names = g.categoryIds.map(nameOf).filter(Boolean).join(', ');
          if (g.amount === null) {
            return (
              <div key={g.groupId} className="rounded-xl border border-dashed border-slate-300 p-3.5 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon icon={g.icon} color={g.color} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{g.name}</p>
                    <p className="text-[11px] text-slate-500 fin-num truncate">Đã chi {formatCompactVND(g.spent)} ₫{names ? ` · ${names}` : ''}</p>
                  </div>
                </div>
                <button type="button" className="fin-btn fin-btn-outline fin-btn-sm text-teal-700 shrink-0" onClick={() => onEdit(g)}>
                  <Plus className="w-3.5 h-3.5" aria-hidden /> Đặt hạn mức
                </button>
              </div>
            );
          }
          const used = g.amount > 0 ? g.spent / g.amount : 0;
          const left = g.amount - g.spent;
          const over = g.spent > g.amount;
          const near = !over && used >= NEAR_THRESHOLD;
          return (
            <button
              key={g.groupId}
              type="button"
              onClick={() => onEdit(g)}
              className="group rounded-xl border border-slate-200 p-3.5 flex flex-col gap-2.5 bg-white text-left hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon icon={g.icon} color={g.color} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {g.name}
                      {g.source === 'MONTH' && <span className="ml-1.5 text-[10px] font-semibold text-violet-700 align-middle">riêng tháng</span>}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate" title={names}>
                      {names || 'Chưa có danh mục'}
                    </p>
                  </div>
                </div>
                <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-700 shrink-0 mt-1" aria-hidden />
              </div>
              <div className="flex items-baseline justify-between gap-2 w-full fin-num">
                <span className={`text-[18px] font-bold leading-6 ${over ? 'text-rose-600' : 'text-slate-900'}`}>{formatCompactVND(g.spent)} ₫</span>
                <span className="text-xs text-slate-500">/ {formatCompactVND(g.amount)} ₫</span>
              </div>
              <ProgressTrack
                percent={used}
                fill={over ? '#cc1e44' : near ? '#d97706' : g.color}
                timePct={clock.phase === 'current' ? clock.timePct : null}
                height="h-2"
                label={`Đã chi của nhóm ${g.name}`}
              />
              <div className="flex justify-between text-[11px] text-slate-600 fin-num w-full">
                <span>
                  Đã chi <b className={over ? 'text-rose-600' : near ? 'text-amber-700' : 'text-slate-900'}>{pct(used)}</b>
                </span>
                <span>
                  {left >= 0 ? 'Còn' : 'Vượt'} <b className={left >= 0 ? 'text-teal-700' : 'text-rose-600'}>{formatCompactVND(Math.abs(left))} ₫</b>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
