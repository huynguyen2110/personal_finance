'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  HeartPulse,
  PiggyBank,
  Plus,
  ShoppingBag,
  SquarePen,
  Wallet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import DatePicker from '@/components/shared/DatePicker';
import { useQueryClient } from '@tanstack/react-query';
import AccountBudgetsSection from './AccountBudgetsSection';
import BudgetCard from './BudgetCard';
import BudgetEditModal from './BudgetEditModal';
import GroupBudgetModal from './GroupBudgetModal';
import GroupBudgetsSection from './GroupBudgetsSection';
import QuickEditModal from './QuickEditModal';
import { HistoryCard, RebalanceCard } from './SideCards';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { copyBudgetsFromPrevMonth, useBudgetPage } from '../lib';
import { formatCompactVND, formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel, formatMonthRange } from '@/lib/dates';
import { useMonthStartDay } from '@/modules/settings/lib';
import { budgetState, budgetTotals, budgetUnits, childrenByParent, monthClock, sortByState, topLevelLines, type BudgetState } from '../utils/budget-insights';
import type { BudgetLine, GroupBudgetStatus } from '../types';


type Filter = 'all' | 'alert' | 'safe' | 'none';
const FILTER_STATES: Record<Filter, BudgetState[]> = {
  all: ['over', 'near', 'ok', 'unused', 'none'],
  alert: ['over', 'near'],
  safe: ['ok', 'unused'],
  none: ['none'],
};

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;

function Kpi({
  label,
  icon: Icon,
  iconClass,
  children,
}: {
  label: string;
  icon: typeof Wallet;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fin-card p-4 flex flex-col justify-between gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="fin-label">{label}</span>
        <span className={`p-1.5 rounded-lg bg-slate-100 ${iconClass}`}>
          <Icon className="w-4 h-4" aria-hidden />
        </span>
      </div>
      {children}
    </div>
  );
}

export default function BudgetsPage() {
  // Tháng tài chính (ngày bắt đầu tháng trong cài đặt, VD ngày lương 5: "T10" = 05/10 → 04/11); chưa chọn thì là tháng hiện tại
  const sd = useMonthStartDay();
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const month = monthOverride ?? currentMonthVN(sd);
  const setMonth = (next: string | ((prev: string) => string)) => setMonthOverride(typeof next === 'function' ? next(month) : next);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<BudgetLine | 'new' | null>(null);
  const [quickEdit, setQuickEdit] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupBudgetStatus | null>(null);
  const qc = useQueryClient();
  const reload = useCallback(() => invalidateFinanceData(qc), [qc]);
  const { data, error } = useBudgetPage(month);
  const loading = !data || data.month !== month;

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  const clock = useMemo(() => monthClock(month, sd), [month, sd]);
  // Hiển thị theo dòng cấp cao nhất (danh mục cha đã gộp số liệu các con); con nằm trong thẻ của cha
  const lines = useMemo(() => (data ? sortByState(topLevelLines(data.lines)) : []), [data]);
  const subLines = useMemo(() => childrenByParent(data?.lines ?? []), [data]);
  const budgeted = lines.filter((l) => l.amount !== null);
  const groups = useMemo(() => data?.groups ?? [], [data]);
  const budgetedGroups = groups.filter((g) => g.amount !== null);
  // Tổng không cộng trùng: nhóm có hạn mức riêng tính theo nhóm, còn lại theo danh mục cha
  const totals = budgetTotals(lines, groups);
  const totalBudget = totals.budget;
  const spentBudgeted = totals.spent;
  const remaining = totalBudget - spentBudgeted;
  const usedPct = totalBudget > 0 ? spentBudgeted / totalBudget : 0;
  const counts = { over: 0, near: 0, ok: 0, unused: 0, none: 0 } as Record<BudgetState, number>;
  for (const l of lines) counts[budgetState(l)]++;
  // Tình trạng theo "đơn vị hạn mức": từng nhóm có hạn mức + từng danh mục cha có hạn mức không nằm trong các nhóm đó
  const budgetedOutside = budgeted.filter((l) => !totals.coveredIds.has(l.categoryId));
  const units = [...budgetedGroups, ...budgetedOutside];
  const unitCounts = { over: 0, near: 0, ok: 0, unused: 0, none: 0 } as Record<BudgetState, number>;
  for (const u of units) unitCounts[budgetState({ ...u, categoryId: 0 })]++;
  const healthy = unitCounts.ok + unitCounts.unused;
  const hasAnyBudget = budgeted.length > 0 || budgetedGroups.length > 0;
  const visible = lines.filter((l) => FILTER_STATES[filter].includes(budgetState(l)));
  const isCurrent = month === currentMonthVN(sd);

  // Chênh lệch giữa % đã chi và % thời gian đã qua (dương = tiêu nhanh hơn nhịp tháng)
  const paceDiff = usedPct - clock.timePct;

  async function copyPrev() {
    try {
      const r = await copyBudgetsFromPrevMonth(month);
      toast.success(
        r.copied
          ? `Đã sao chép ${r.copied} hạn mức riêng từ ${formatMonthLabel(addMonths(month, -1))}`
          : `${formatMonthLabel(addMonths(month, -1))} không có hạn mức riêng — các tháng đã tự dùng hạn mức mặc định`
      );
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="font-jakarta">
      <Header
        title="Ngân sách & Hạn mức chi tiêu"
        subtitle="Đặt hạn mức theo tháng, theo dõi nhịp chi và cảnh báo sớm trước khi vượt"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-white border border-slate-200 p-1 rounded-lg">
              <button type="button" className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Tháng trước">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <DatePicker mode="month" variant="ghost" ariaLabel="Chọn tháng" value={month} onChange={(v) => v && setMonth(v)} className="text-sm" />
              {sd > 1 && (
                <span className="hidden md:inline px-1.5 text-[11px] text-slate-500 fin-num whitespace-nowrap" title={`Tháng tính từ ngày ${sd} (đổi ở Cài đặt)`}>
                  {formatMonthRange(month, sd)}
                </span>
              )}
              <button type="button" className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Tháng sau">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isCurrent ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">Kỳ hiện tại</span>
            ) : (
              <button type="button" className="fin-btn fin-btn-ghost fin-btn-sm" onClick={() => setMonthOverride(null)}>
                Về tháng này
              </button>
            )}
            <button type="button" className="fin-btn fin-btn-outline" onClick={copyPrev}>
              <Copy className="w-4 h-4 text-slate-400" /> <span className="hidden sm:inline">Chép từ tháng trước</span>
            </button>
            <button type="button" className="fin-btn fin-btn-outline text-teal-700" onClick={() => setQuickEdit(true)} disabled={!data}>
              <SquarePen className="w-4 h-4" /> <span className="hidden sm:inline">Chỉnh sửa nhanh</span>
            </button>
            <button type="button" className="fin-btn fin-btn-primary" onClick={() => setEditing('new')} disabled={!data}>
              <Plus className="w-4 h-4" /> Đặt hạn mức mới
            </button>
          </div>
        }
      />

      <div className={`px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {!data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fin-card h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* 4 KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Kpi label="Tổng ngân sách tháng" icon={Wallet} iconClass="text-teal-700">
                <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
                  {new Intl.NumberFormat('vi-VN').format(totalBudget)} <span className="text-base font-semibold text-slate-500">₫</span>
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />{' '}
                    {[budgetedGroups.length ? `${budgetedGroups.length} nhóm` : '', budgetedOutside.length ? `${budgetedOutside.length} danh mục` : ''].filter(Boolean).join(' · ') || 'Chưa áp dụng'}
                  </span>
                  <span className="font-semibold text-teal-700 fin-num">
                    {data.income > 0 ? `${pct(totalBudget / data.income)} thu nhập` : 'Chưa có thu nhập tháng này'}
                  </span>
                </div>
              </Kpi>

              <Kpi label="Đã chi thực tế" icon={ShoppingBag} iconClass="text-emerald-600">
                <p className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">
                  {new Intl.NumberFormat('vi-VN').format(spentBudgeted)} <span className="text-base font-semibold text-slate-500">₫</span>
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border font-semibold fin-num ${
                      usedPct > 1
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : clock.phase === 'current' && paceDiff > 0.02
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    Đã tiêu {pct(usedPct)}
                  </span>
                  <span className="fin-num">
                    {clock.phase === 'current' ? `Ngày ${clock.elapsed}/${clock.daysInMonth}` : clock.phase === 'past' ? 'Đã kết thúc' : 'Chưa bắt đầu'}
                  </span>
                </div>
                {data.expense > spentBudgeted && (
                  <p className="text-[11px] text-slate-500 fin-num">Tổng chi cả tháng (kể cả chưa đặt hạn mức): {formatVND(data.expense)}</p>
                )}
              </Kpi>

              <Kpi label="Ngân sách khả dụng" icon={PiggyBank} iconClass="text-teal-700">
                <p className={`text-[28px] leading-9 font-bold tracking-[-0.02em] fin-num ${remaining >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                  {remaining >= 0 ? '+' : '−'}
                  {new Intl.NumberFormat('vi-VN').format(Math.abs(remaining))} <span className="text-base font-semibold opacity-70">₫</span>
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{clock.phase === 'current' ? 'Định mức còn lại:' : remaining >= 0 ? 'Còn dư' : 'Vượt tổng'}</span>
                  <span className="font-semibold text-slate-900 fin-num">
                    {clock.phase === 'current' && clock.daysLeft > 0 && remaining > 0
                      ? `~${formatCompactVND(remaining / clock.daysLeft)} ₫/ngày (${clock.daysLeft} ngày)`
                      : formatVND(Math.abs(remaining))}
                  </span>
                </div>
              </Kpi>

              <Kpi label="Tình trạng hạn mức" icon={HeartPulse} iconClass="text-rose-500">
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] leading-9 font-bold tracking-[-0.02em] text-slate-900 fin-num">{healthy}</span>
                  <span className="text-base font-semibold text-slate-500 fin-num">/{units.length} an toàn</span>
                  {unitCounts.over > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                      {unitCounts.over} vượt mức
                    </span>
                  )}
                </div>
                {units.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 h-1.5 gap-0.5 rounded-full overflow-hidden" aria-hidden>
                      {unitCounts.over > 0 && <span className="bg-rose-500" style={{ flex: unitCounts.over }} />}
                      {unitCounts.near > 0 && <span className="bg-amber-500" style={{ flex: unitCounts.near }} />}
                      {healthy > 0 && <span className="bg-teal-700" style={{ flex: healthy }} />}
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap fin-num">
                      {unitCounts.over} vượt · {unitCounts.near} sắp chạm
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Chưa đặt hạn mức nào</p>
                )}
              </Kpi>
            </div>

            {/* Chưa có hạn mức nào */}
            {!hasAnyBudget && (
              <section className="fin-card p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6" aria-hidden />
                </span>
                <div className="flex-1">
                  <h2 className="text-[16px] font-semibold text-slate-900">Bắt đầu đặt hạn mức chi tiêu</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Đặt hạn mức cho từng danh mục hoặc cả nhóm, web sẽ theo dõi và cảnh báo khi sắp vượt.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="fin-btn fin-btn-outline text-teal-700" onClick={() => setQuickEdit(true)}>
                    <SquarePen className="w-4 h-4" /> Đặt nhiều danh mục
                  </button>
                  <button type="button" className="fin-btn fin-btn-primary" onClick={() => setEditing('new')}>
                    <Plus className="w-4 h-4" /> Đặt hạn mức
                  </button>
                </div>
              </section>
            )}

            {/* Hạn mức chung cho cả nhóm chi tiêu */}
            <GroupBudgetsSection groups={groups} lines={data.lines} clock={clock} onEdit={setEditingGroup} />

            {/* Phân bổ đầu tháng theo tài khoản → nhóm chi tiêu */}
            <AccountBudgetsSection
              accounts={data.accounts ?? []}
              unassignedGroups={data.unassignedGroups ?? []}
              clock={clock}
              lines={data.lines}
              onEditGroup={(id) => setEditingGroup(groups.find((g) => g.groupId === id) ?? null)}
              onQuickEdit={() => setQuickEdit(true)}
            />


            {/* Danh sách + cột phải */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
              <div className="lg:col-span-8 flex flex-col gap-3">
                <div className="fin-card p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-slate-900">Danh mục chi tiêu</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold fin-num">{lines.length} danh mục</span>
                  </div>
                  <div className="inline-flex p-1 rounded-lg bg-slate-100 self-start overflow-x-auto max-w-full" role="tablist">
                    {(
                      [
                        ['all', `Tất cả (${lines.length})`],
                        ['alert', `Vượt / Sắp chạm (${counts.over + counts.near})`],
                        ['safe', `Còn an toàn (${counts.ok + counts.unused})`],
                        ['none', `Chưa đặt (${counts.none})`],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        role="tab"
                        aria-selected={filter === k}
                        onClick={() => setFilter(k)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors fin-num ${
                          filter === k ? 'bg-white text-slate-900 shadow-sm' : k === 'alert' && counts.over + counts.near > 0 ? 'text-rose-600 hover:text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {visible.length === 0 ? (
                  <div className="fin-card p-8 text-center text-sm text-slate-500">Không có danh mục nào trong nhóm này</div>
                ) : (
                  visible.map((l) => (
                    <BudgetCard key={l.categoryId} line={l} subLines={subLines.get(l.categoryId) ?? []} month={month} startDay={sd} clock={clock} onEdit={setEditing} />
                  ))
                )}
              </div>

              <div className="lg:col-span-4 flex flex-col gap-4">
                <RebalanceCard lines={budgetUnits(data.lines)} month={month} clock={clock} onApplied={reload} />
                <HistoryCard history={data.history} month={month} />
              </div>
            </div>
          </>
        )}
      </div>

      {editing && data && (
        <BudgetEditModal lines={data.lines} groups={groups} month={month} line={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {editingGroup && data && <GroupBudgetModal group={editingGroup} lines={data.lines} month={month} onClose={() => setEditingGroup(null)} onSaved={reload} />}
      {quickEdit && data && <QuickEditModal lines={data.lines} month={month} onClose={() => setQuickEdit(false)} onSaved={reload} />}
    </div>
  );
}
