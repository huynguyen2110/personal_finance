'use client';

import Link from 'next/link';
import { Landmark, Layers, SquarePen, TriangleAlert, Wallet } from 'lucide-react';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { formatCompactVND } from '@/lib/money';
import { bankBrand } from '@/modules/accounts/lib/brand';
import type { AccountBudgetLine, BudgetLine, GroupBudgetLine } from '../types';
import type { MonthClock } from '../utils/budget-insights';
import { ProgressTrack } from './BudgetCard';

interface Props {
  accounts: AccountBudgetLine[];
  unassignedGroups: GroupBudgetLine[];
  clock: MonthClock;
  lines: BudgetLine[];
  // Mở sửa hạn mức của một danh mục cha (nhóm chỉ có một danh mục cha)
  onEditCategory: (line: BudgetLine) => void;
  // Mở bảng chỉnh sửa nhanh nhiều danh mục
  onQuickEdit: () => void;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Avatar({ a }: { a: AccountBudgetLine }) {
  if (a.type === 'CASH') {
    return (
      <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Wallet className="w-5 h-5" aria-hidden />
      </span>
    );
  }
  const b = bankBrand(a.bankName ?? a.name);
  return (
    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: `${b.color}14`, color: b.color }} aria-hidden>
      {b.short}
    </span>
  );
}

function GroupRow({ g, lines, onEditCategory, onQuickEdit }: { g: GroupBudgetLine; lines: BudgetLine[]; onEditCategory: (l: BudgetLine) => void; onQuickEdit: () => void }) {
  const over = g.budget !== null && g.spent > g.budget;
  const ratio = g.budget && g.budget > 0 ? g.spent / g.budget : 0;
  const parents = g.categoryIds.map((id) => lines.find((l) => l.categoryId === id)).filter((l): l is BudgetLine => !!l);
  const edit = () => (parents.length === 1 ? onEditCategory(parents[0]) : onQuickEdit());
  return (
    <li className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="flex items-center gap-2 min-w-0 text-left hover:text-teal-700" onClick={edit} title={parents.map((p) => p.name).join(', ')}>
          <CategoryIcon icon={g.icon} color={g.color} size="sm" />
          <span className="text-sm font-semibold text-slate-800 truncate">{g.name}</span>
          {g.sharedAccounts > 0 && (
            <span className="text-[10px] text-slate-400 whitespace-nowrap" title="Nhóm này cũng gán cho tài khoản khác nên hạn mức được tính ở nhiều nơi">
              · dùng chung
            </span>
          )}
        </button>
        <span className={`text-xs fin-num whitespace-nowrap ${over ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
          {formatCompactVND(g.spent)} ₫
          {g.budget !== null ? (
            <span className="text-slate-400"> / {formatCompactVND(g.budget)} ₫</span>
          ) : (
            <button type="button" className="ml-1 text-teal-700 font-semibold hover:underline" onClick={edit}>
              đặt hạn mức
            </button>
          )}
        </span>
      </div>
      {g.budget !== null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: over ? '#cc1e44' : g.color }} />
        </div>
      )}
    </li>
  );
}

// Hạn mức các nhóm đã gán đang "phân bổ" cho từng tài khoản bao nhiêu, và tài khoản đó đã chi bao nhiêu
export default function AccountBudgetsSection({ accounts, unassignedGroups, clock, lines, onEditCategory, onQuickEdit }: Props) {
  const totalPlanned = accounts.reduce((s, a) => s + a.planned, 0);
  const totalSpent = accounts.reduce((s, a) => s + a.spent, 0);
  const withGroups = accounts.filter((a) => a.groups.length > 0);
  if (withGroups.length === 0 && unassignedGroups.length === 0) {
    return (
      <section className="fin-card p-4 md:p-5 flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-teal-700 shrink-0">
          <Landmark className="w-5 h-5" aria-hidden />
        </span>
        <div className="text-xs text-slate-600">
          <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Phân bổ theo tài khoản</h2>
          <p className="mt-0.5 flex items-start gap-1.5">
            <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0 mt-px" aria-hidden />
            <span>
              Chưa tài khoản nào được gán nhóm chi tiêu. Vào{' '}
              <Link href="/categories" className="font-semibold text-teal-700 hover:underline">
                Danh mục & Quy tắc → Nhóm & Tài khoản
              </Link>{' '}
              để tạo nhóm và gán cho ngân hàng thường chi cho nhóm đó; hạn mức của các nhóm sẽ hiện ở đây theo từng tài khoản.
            </span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="fin-card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-teal-700">
            <Landmark className="w-5 h-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Phân bổ theo tài khoản</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 fin-num">
          <span>
            Hạn mức đã phân bổ: <b className="text-slate-900">{formatCompactVND(totalPlanned)} ₫</b>
          </span>
          <span>
            Đã chi: <b className={totalPlanned && totalSpent > totalPlanned ? 'text-rose-600' : 'text-slate-900'}>{formatCompactVND(totalSpent)} ₫</b>
          </span>
          <button type="button" className="fin-btn fin-btn-outline fin-btn-sm text-teal-700" onClick={onQuickEdit}>
            <SquarePen className="w-3.5 h-3.5" aria-hidden /> Chia hạn mức
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {withGroups.map((a) => {
          const used = a.planned > 0 ? a.spent / a.planned : 0;
          const left = a.planned - a.spent;
          return (
            <div key={a.accountId} className="rounded-xl border border-slate-200 p-3.5 flex flex-col gap-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar a={a} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                    <p className="text-[11px] text-slate-500 fin-num">{a.groups.length} nhóm · {a.groups.filter((g) => g.budget !== null).length} có hạn mức</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[11px] text-slate-500 whitespace-nowrap">Hạn mức phân bổ</span>
                  <span className="block text-[18px] font-bold text-slate-900 fin-num leading-6">{a.planned > 0 ? `${formatCompactVND(a.planned)} ₫` : <span className="text-sm text-slate-400 font-semibold">Chưa đặt</span>}</span>
                </div>
              </div>

              {a.planned > 0 ? (
                <div className="flex flex-col gap-1">
                  <ProgressTrack percent={used} fill={used > 1 ? '#cc1e44' : '#0F766E'} timePct={clock.phase === 'current' ? clock.timePct : null} height="h-2" label={`Đã chi của ${a.name}`} />
                  <div className="flex justify-between text-[11px] text-slate-600 fin-num">
                    <span>
                      Đã chi <b className={used > 1 ? 'text-rose-600' : 'text-slate-900'}>{pct(used)}</b> ({formatCompactVND(a.spent)} ₫)
                    </span>
                    <span>
                      {left >= 0 ? 'Còn' : 'Vượt'} <b className={left >= 0 ? 'text-teal-700' : 'text-rose-600'}>{formatCompactVND(Math.abs(left))} ₫</b>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 fin-num">Đã chi {formatCompactVND(a.spent)} ₫ · chưa đặt hạn mức</p>
              )}

              <ul className="divide-y divide-slate-100 -my-1">
                {a.groups.map((g) => (
                  <GroupRow key={g.groupId} g={g} lines={lines} onEditCategory={onEditCategory} onQuickEdit={onQuickEdit} />
                ))}
                {a.spentOutside > 0 && (
                  <li className="flex items-center justify-between gap-2 py-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 inline-flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5" aria-hidden />
                      </span>
                      Chi ngoài nhóm đã gán
                    </span>
                    <span className="fin-num">{formatCompactVND(a.spentOutside)} ₫</span>
                  </li>
                )}
              </ul>
            </div>
          );
        })}

        {unassignedGroups.length > 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-3.5 flex flex-col gap-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Nhóm chưa gán tài khoản</p>
                <p className="text-[11px] text-slate-500">Hạn mức của các nhóm này chưa thuộc tài khoản nào.</p>
              </div>
            </div>
            <ul className="divide-y divide-slate-200/70 -my-1">
              {unassignedGroups.map((g) => (
                <GroupRow key={g.groupId} g={g} lines={lines} onEditCategory={onEditCategory} onQuickEdit={onQuickEdit} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
