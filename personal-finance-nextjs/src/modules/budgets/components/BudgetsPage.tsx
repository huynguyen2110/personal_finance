'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Gauge,
  HeartPulse,
  Info,
  PiggyBank,
  Plus,
  ShoppingBag,
  SquarePen,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import DatePicker from '@/components/shared/DatePicker';
import { useQueryClient } from '@tanstack/react-query';
import AccountBudgetsSection from './AccountBudgetsSection';
import BudgetCard, { ProgressTrack } from './BudgetCard';
import BudgetEditModal from './BudgetEditModal';
import QuickEditModal from './QuickEditModal';
import { HistoryCard, HowItWorksCard, RebalanceCard } from './SideCards';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { copyBudgetsFromPrevMonth, useBudgetPage } from '../lib';
import { formatCompactVND, formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel } from '@/lib/dates';
import { budgetState, budgetUnits, childrenByParent, monthClock, sortByState, topLevelLines, type BudgetState } from '../utils/budget-insights';
import type { BudgetLine } from '../types';


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
  const [month, setMonth] = useState(currentMonthVN);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<BudgetLine | 'new' | null>(null);
  const [quickEdit, setQuickEdit] = useState(false);
  const qc = useQueryClient();
  const reload = useCallback(() => invalidateFinanceData(qc), [qc]);
  const { data, error } = useBudgetPage(month);
  const loading = !data || data.month !== month;

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  const clock = useMemo(() => monthClock(month), [month]);
  // Hiển thị theo dòng cấp cao nhất (danh mục cha đã gộp số liệu các con); con nằm trong thẻ của cha
  const lines = useMemo(() => (data ? sortByState(topLevelLines(data.lines)) : []), [data]);
  const subLines = useMemo(() => childrenByParent(data?.lines ?? []), [data]);
  const budgeted = lines.filter((l) => l.amount !== null);
  const totalBudget = budgeted.reduce((s, l) => s + (l.amount ?? 0), 0);
  const spentBudgeted = budgeted.reduce((s, l) => s + l.spent, 0);
  const remaining = totalBudget - spentBudgeted;
  const usedPct = totalBudget > 0 ? spentBudgeted / totalBudget : 0;
  const counts = { over: 0, near: 0, ok: 0, unused: 0, none: 0 } as Record<BudgetState, number>;
  for (const l of lines) counts[budgetState(l)]++;
  const healthy = counts.ok + counts.unused;
  const visible = lines.filter((l) => FILTER_STATES[filter].includes(budgetState(l)));
  const isCurrent = month === currentMonthVN();

  // Danh mục kéo nhịp chi nhanh nhất (chi vượt phần "đáng lẽ" theo thời gian nhiều nhất)
  const fastest =
    clock.phase === 'current'
      ? budgeted
          .map((l) => ({ l, ahead: l.spent - (l.amount ?? 0) * clock.timePct }))
          .filter((x) => x.ahead > 0)
          .sort((a, b) => b.ahead - a.ahead)[0]
      : undefined;
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
              <button type="button" className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Tháng sau">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isCurrent ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">Kỳ hiện tại</span>
            ) : (
              <button type="button" className="fin-btn fin-btn-ghost fin-btn-sm" onClick={() => setMonth(currentMonthVN())}>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-700" /> {budgeted.length} danh mục áp dụng
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
                  <span className="text-base font-semibold text-slate-500 fin-num">/{budgeted.length} an toàn</span>
                  {counts.over > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                      {counts.over} vượt mức
                    </span>
                  )}
                </div>
                {budgeted.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 h-1.5 gap-0.5 rounded-full overflow-hidden" aria-hidden>
                      {counts.over > 0 && <span className="bg-rose-500" style={{ flex: counts.over }} />}
                      {counts.near > 0 && <span className="bg-amber-500" style={{ flex: counts.near }} />}
                      {healthy > 0 && <span className="bg-teal-700" style={{ flex: healthy }} />}
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap fin-num">
                      {counts.over} vượt · {counts.near} sắp chạm
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Chưa đặt hạn mức nào</p>
                )}
              </Kpi>
            </div>

            {/* Chưa có hạn mức nào */}
            {budgeted.length === 0 && (
              <section className="fin-card p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6" aria-hidden />
                </span>
                <div className="flex-1">
                  <h2 className="text-[16px] font-semibold text-slate-900">Bắt đầu đặt hạn mức chi tiêu</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đặt hạn mức <b>mặc định hàng tháng</b> cho từng danh mục — web tự áp dụng cho mọi tháng, theo dõi nhịp chi và cảnh
                    báo khi chạm 80%. Mức chi tháng trước của mỗi danh mục được gợi ý sẵn khi đặt.
                  </p>
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

            {/* Phân bổ đầu tháng theo tài khoản → nhóm chi tiêu */}
            <AccountBudgetsSection
              accounts={data.accounts ?? []}
              unassignedGroups={data.unassignedGroups ?? []}
              clock={clock}
              lines={data.lines}
              onEditCategory={(l) => setEditing(l)}
              onQuickEdit={() => setQuickEdit(true)}
            />

            {/* Nhịp chi so với thời gian */}
            {budgeted.length > 0 && clock.phase !== 'future' && (
              <section className="fin-card p-4 md:p-6 flex flex-col gap-3.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-teal-700">
                      <Gauge className="w-5 h-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Tiến độ chi tiêu so với nhịp thời gian</h2>
                      <p className="text-xs text-slate-500 fin-num">
                        {clock.phase === 'current'
                          ? `Hôm nay là ngày ${clock.elapsed}/${clock.daysInMonth} (đã qua ${pct(clock.timePct)} tháng)`
                          : `${formatMonthLabel(month)} đã kết thúc`}
                      </p>
                    </div>
                  </div>
                  {clock.phase === 'current' &&
                    (paceDiff > 0.02 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold self-start fin-num">
                        <TrendingUp className="w-4 h-4" aria-hidden /> Tiêu nhanh hơn thời gian +{pct(paceDiff)}
                      </span>
                    ) : paceDiff < -0.02 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold self-start fin-num">
                        <TrendingDown className="w-4 h-4" aria-hidden /> Chậm hơn thời gian {pct(-paceDiff)}
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold self-start">Đúng nhịp</span>
                    ))}
                </div>

                <ProgressTrack
                  percent={usedPct}
                  fill={usedPct > 1 ? '#F43F5E' : '#0F766E'}
                  timePct={clock.phase === 'current' ? clock.timePct : null}
                  height="h-3"
                  label="Tỷ lệ đã chi trên tổng ngân sách"
                />
                <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600 fin-num">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-2 rounded bg-teal-700" />
                    Đã chi: <b className="text-slate-900">{pct(usedPct)} ({formatCompactVND(spentBudgeted)} ₫)</b>
                  </span>
                  {clock.phase === 'current' && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-0.5 h-3 bg-slate-900" /> Mốc ngày {clock.elapsed} ({pct(clock.timePct)})
                    </span>
                  )}
                  <span>
                    {remaining >= 0 ? 'Còn lại' : 'Vượt'}:{' '}
                    <b className={remaining >= 0 ? 'text-teal-700' : 'text-rose-600'}>
                      {formatCompactVND(Math.abs(remaining))} ₫{clock.phase === 'current' ? ` (${clock.daysLeft} ngày)` : ''}
                    </b>
                  </span>
                </div>

                {fastest && paceDiff > 0.02 && (
                  <div className="p-2.5 rounded-lg bg-slate-50 flex items-start gap-2.5 text-xs text-slate-600">
                    <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" aria-hidden />
                    <span>
                      <b className="text-slate-900">Cảnh báo nhịp chi:</b> danh mục kéo nhịp nhanh nhất là{' '}
                      <b className="text-slate-900">{fastest.l.name}</b> — đã chi nhiều hơn mức “đáng lẽ” theo thời gian{' '}
                      <b className="fin-num">{formatVND(Math.round(fastest.ahead))}</b>. Nên ưu tiên kiểm soát danh mục này trong{' '}
                      {clock.daysLeft} ngày còn lại.
                    </span>
                  </div>
                )}
              </section>
            )}

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
                    <BudgetCard key={l.categoryId} line={l} subLines={subLines.get(l.categoryId) ?? []} month={month} clock={clock} onEdit={setEditing} />
                  ))
                )}
              </div>

              <div className="lg:col-span-4 flex flex-col gap-4">
                <RebalanceCard lines={budgetUnits(data.lines)} month={month} clock={clock} onApplied={reload} />
                <HistoryCard history={data.history} month={month} />
                <HowItWorksCard />
              </div>
            </div>
          </>
        )}
      </div>

      {editing && data && (
        <BudgetEditModal lines={data.lines} month={month} line={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {quickEdit && data && <QuickEditModal lines={data.lines} month={month} onClose={() => setQuickEdit(false)} onSaved={reload} />}
    </div>
  );
}
