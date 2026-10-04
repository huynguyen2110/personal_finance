'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Flag,
  MailCheck,
  MailWarning,
  PieChart,
  PiggyBank,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import PeriodFilter from '@/components/shared/PeriodFilter';
import CategoryIcon from '@/components/shared/CategoryIcon';
import TxnMiniList from '@/components/shared/TxnMiniList';
import ChartCard, { DataTable } from '@/components/charts/ChartCard';
import MonthlyBars, { MonthlyTable } from '@/components/charts/MonthlyBars';
import CumulativeChart, { CumulativeTable } from '@/components/charts/CumulativeChart';
import CategoryBreakdown from '@/components/charts/CategoryBreakdown';
import WeekdayChart, { WeekdayTable, type WeekdayDatum } from '@/components/charts/WeekdayChart';
import { CHART } from '@/components/charts/theme';
import { usePeriod } from '@/hooks/usePeriod';
import { useAccounts } from '@/modules/accounts/lib';
import { bankBrand } from '@/modules/accounts/lib/brand';
import { pollEmails, useEmailStatus } from '@/modules/email/lib';
import { useGoalsPage } from '@/modules/goals/lib';
import { GoalIcon, PRIORITIES } from '@/modules/goals/utils/goal-meta';
import { monthClock } from '@/modules/budgets/utils/budget-insights';
import { errorMessage } from '@/lib/api-client';
import { invalidateFinanceData } from '@/lib/query-client';
import { qs } from '@/lib/url';
import { formatCompactVND, formatVND } from '@/lib/money';
import { addDaysStr, daysBetween, formatMonthLabel, formatVNDate, formatVNDateTime, weekdayOf } from '@/lib/dates';
import type { TransactionDTO } from '@/modules/transactions/types';
import { useDashboard } from '../lib';
import type { CategoryTotal } from '../types';

const nf = new Intl.NumberFormat('vi-VN');
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1).replace('.', ',')}%`);
const change = (cur: number, prev: number): number | null => (prev === 0 ? null : (cur - prev) / Math.abs(prev));

const SOURCE_LABEL: Record<TransactionDTO['source'], string> = { EMAIL: 'Email NH', MANUAL: 'Nhập tay', IMPORT: 'Nhập file' };
const CATEGORIZED_LABEL: Record<TransactionDTO['categorizedBy'], { text: string; className: string }> = {
  RULE: { text: 'Tự động khớp', className: 'text-emerald-700' },
  ACCOUNT: { text: 'Theo tài khoản', className: 'text-emerald-700' },
  MANUAL: { text: 'Gán tay', className: 'text-slate-500' },
  NONE: { text: 'Chưa phân loại', className: 'text-amber-700' },
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const { ready, preset, period, accountId, setPreset, setCustom, setAccountId } = usePeriod('this_month');
  const { data: accounts = [] } = useAccounts();
  const { data: goalsPage } = useGoalsPage();
  const { data: email } = useEmailStatus();
  const { data, isFetching: loading, error } = useDashboard({ from: period.from, to: period.to, accountId }, { enabled: ready });
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  // Chi trung bình theo thứ = tổng chi thứ đó / số ngày thứ đó trong kỳ
  const weekdayData: WeekdayDatum[] = useMemo(() => {
    if (!data) return [];
    const counts = Array(7).fill(0);
    const n = Math.min(daysBetween(data.period.from, data.period.to), 800);
    for (let i = 0; i < n; i++) counts[weekdayOf(addDaysStr(data.period.from, i))]++;
    return data.weekday.map((w) => ({ weekday: w.weekday, total: w.expense, days: counts[w.weekday], average: counts[w.weekday] ? w.expense / counts[w.weekday] : 0 }));
  }, [data]);

  // 2 mục tiêu đáng chú ý nhất: chưa lưu trữ, chưa xong, ưu tiên cao trước rồi tới gần đích
  const topGoals = useMemo(
    () =>
      (goalsPage?.goals ?? [])
        .filter((g) => !g.archivedAt && g.status !== 'done')
        .sort((a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank || b.progress - a.progress)
        .slice(0, 3),
    [goalsPage]
  );

  async function readEmails() {
    setPolling(true);
    try {
      const r = await pollEmails();
      toast.success(r.created ? `Đã thêm ${r.created} giao dịch mới từ email` : 'Không có giao dịch mới trong hộp thư');
      invalidateFinanceData(qc);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPolling(false);
    }
  }

  const s = data?.summary;
  const p = data?.prevSummary;
  const sd = data?.monthStartDay ?? 1;
  const txnLink = (extra: Record<string, string | number | null>) => `/transactions${qs({ from: period.from, to: period.to, accountId, ...extra })}`;

  // Số liệu dẫn xuất cho KPI và nhận xét
  const banks = data?.balances.filter((a) => a.type === 'BANK').length ?? 0;
  const cash = data?.balances.filter((a) => a.type === 'CASH').length ?? 0;
  // Nguồn thu lớn nhất đã phân loại (bỏ "Chưa phân loại")
  const topIncome = data?.incomeByCategory.find((c) => c.categoryId !== null);
  const budgetPct = data && data.budget.totalBudget > 0 ? data.budget.totalSpent / data.budget.totalBudget : null;
  const last6 = data?.monthly.slice(-6) ?? [];
  const avgExpense6 = last6.length ? last6.reduce((t, m) => t + m.expense, 0) / last6.length : 0;
  // Nhịp chi của tháng ngân sách so với thời gian đã trôi qua
  const clock = data ? monthClock(data.budget.month, sd) : null;
  const paceDiff = data && clock && budgetPct !== null && clock.phase === 'current' ? budgetPct - clock.timePct : null;

  return (
    <div className="font-jakarta">
      <Header
        title="Tổng quan tài chính"
        subtitle={`${formatVNDate(period.from)} – ${formatVNDate(period.to)}${sd > 1 ? ` · tháng tính từ ngày ${sd}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter preset={preset} period={period} onPreset={setPreset} onCustom={setCustom} accounts={accounts} accountId={accountId} onAccount={setAccountId} />
            {email?.configured && (
              <button type="button" className="fin-btn fin-btn-outline" onClick={readEmails} disabled={polling}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                <MailCheck className="w-4 h-4 text-slate-400" aria-hidden />
                <span className="hidden lg:inline">{polling ? 'Đang đọc…' : 'Đọc email ngân hàng'}</span>
              </button>
            )}
            <Link href="/transactions" className="fin-btn fin-btn-primary">
              <Plus className="w-4 h-4" aria-hidden /> Thêm giao dịch
            </Link>
          </div>
        }
      />

      <div className={`px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {!data || !s || !p ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fin-card h-36 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* 4 KPI */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Kpi label="Tổng số dư khả dụng" icon={<Wallet className="w-5 h-5" />} iconClass="bg-teal-50 text-teal-700" accent="bg-teal-700/30 group-hover:bg-teal-700">
                <Amount value={data.totalBalance} />
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-xs text-slate-500">
                  <Link href="/accounts" className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline">
                    {data.balances.length} tài khoản <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                  </Link>
                  <span className="fin-num">
                    {banks} NH • {cash} ví tiền mặt
                  </span>
                </div>
              </Kpi>

              <Kpi label={`Thu nhập ${preset === 'this_month' ? 'tháng này' : 'kỳ này'}`} icon={<ArrowDownLeft className="w-5 h-5" />} iconClass="bg-emerald-50 text-emerald-700" accent="bg-emerald-500/30 group-hover:bg-emerald-600">
                <Amount value={s.income} className="text-emerald-700" />
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-xs text-slate-500">
                  <Delta value={change(s.income, p.income)} upIsGood />
                  <span className="truncate">{topIncome ? topIncome.name : `${s.incomeCount} giao dịch`}</span>
                </div>
              </Kpi>

              <Kpi label={`Tổng chi tiêu ${preset === 'this_month' ? 'tháng' : 'kỳ này'}`} icon={<ArrowUpRight className="w-5 h-5" />} iconClass="bg-rose-50 text-rose-600" accent="bg-rose-500/30 group-hover:bg-rose-500">
                <Amount value={s.expense} />
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-xs text-slate-500">
                  <Delta value={change(s.expense, p.expense)} upIsGood={false} amount={s.expense - p.expense} />
                  {budgetPct !== null ? (
                    <Link href="/budgets" className={`font-semibold fin-num hover:underline ${budgetPct > 1 ? 'text-rose-600' : budgetPct >= 0.8 ? 'text-amber-700' : 'text-slate-600'}`}>
                      {pct(budgetPct)} hạn mức
                    </Link>
                  ) : (
                    <span className="fin-num">{s.expenseCount} giao dịch</span>
                  )}
                </div>
              </Kpi>

              <Kpi label="Tích lũy & Tiết kiệm" icon={<PiggyBank className="w-5 h-5" />} iconClass="bg-teal-700 text-white" accent="bg-teal-700 group-hover:bg-teal-800">
                <Amount value={s.net} signed className={s.net >= 0 ? 'text-teal-700' : 'text-rose-600'} />
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold fin-num">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden /> Tỷ lệ: {pct(s.savingsRate)}
                  </span>
                  <span className="fin-num">{p.savingsRate !== null ? `Kỳ trước ${pct(p.savingsRate)}` : s.income === 0 ? 'Chưa có thu nhập' : ''}</span>
                </div>
              </Kpi>
            </section>

            {/* Cảnh báo */}
            {(data.uncategorizedCount > 0 || data.budget.alerts.length > 0 || (data.budget.groupAlerts?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-2">
                {data.uncategorizedCount > 0 && (
                  <Link href="/transactions?categoryId=none" className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                    <CircleHelp className="w-4 h-4" aria-hidden />
                    {data.uncategorizedCount} giao dịch chưa phân loại
                  </Link>
                )}
                {(data.budget.groupAlerts ?? []).map((g) => (
                  <Link key={`g${g.groupId}`} href="/budgets" className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${(g.percent ?? 0) >= 1 ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>
                    <TriangleAlert className="w-4 h-4" aria-hidden />
                    Nhóm {g.name} · <span className="fin-num">{pct(g.percent)}</span> hạn mức
                  </Link>
                ))}
                {data.budget.alerts.map((a) => (
                  <Link key={a.categoryId} href="/budgets" className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${(a.percent ?? 0) >= 1 ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>
                    <TriangleAlert className="w-4 h-4" aria-hidden />
                    {a.name} · <span className="fin-num">{pct(a.percent)}</span> hạn mức
                  </Link>
                ))}
              </div>
            )}

            {/* Hàng giữa: biểu đồ (8) + phân bổ & mục tiêu (4) */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
              <div className="xl:col-span-8 flex flex-col gap-4">
                <ChartCard
                  className="!bg-white !border-slate-200 !rounded-2xl !shadow-none fin-card"
                  title="So sánh Thu nhập & Chi tiêu 6 tháng"
                  actions={avgExpense6 > 0 ? <span className="hidden sm:inline text-[11px] font-semibold text-slate-500 fin-num">TB chi: {formatCompactVND(avgExpense6)} ₫/tháng</span> : undefined}
                  table={<MonthlyTable data={last6} />}
                >
                  <MonthlyBars data={last6} height={240} />
                </ChartCard>

                <ChartCard
                  className="fin-card !bg-white !border-slate-200 !rounded-2xl !shadow-none flex-1"
                  title="Chi tiêu tích lũy trong kỳ"
                  subtitle={data.budget.showOnDailyChart ? `Trần ngân sách ${formatVND(data.budget.totalBudget)}` : 'So với kỳ trước'}
                  actions={
                    paceDiff !== null ? (
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold fin-num whitespace-nowrap ${paceDiff > 0.02 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {paceDiff > 0.02 ? `Chi nhanh hơn dự kiến ${pct(paceDiff)}` : paceDiff < -0.02 ? `An toàn: chậm hơn dự kiến ${pct(-paceDiff)}` : 'Đúng nhịp ngân sách'}
                      </span>
                    ) : undefined
                  }
                  table={<CumulativeTable data={data.daily} />}
                >
                  <CumulativeChart data={data.daily} budget={data.budget.showOnDailyChart ? data.budget.totalBudget : null} height={200} />
                </ChartCard>
              </div>

              <div className="xl:col-span-4 flex flex-col gap-4">
                <AllocationCard rows={data.expenseByCategory} total={s.expense} alerts={data.budget.alerts} onSelect={(id) => (window.location.href = txnLink({ direction: 'OUT', categoryId: id ?? 'none' }))} />

                {/* flex-1: giãn cho đầy cột phải, không để trống dưới chân khi cột trái cao hơn */}
                <section className="fin-card p-4 md:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-900 inline-flex items-center gap-2">
                      <Flag className="w-5 h-5 text-emerald-600" aria-hidden /> Mục tiêu tiết kiệm
                    </h2>
                    <Link href="/goals" className="text-xs font-semibold text-teal-700 hover:underline">
                      {topGoals.length ? 'Xem tất cả' : 'Tạo mục tiêu'}
                    </Link>
                  </div>
                  {!goalsPage ? (
                    <div className="h-24 rounded-lg bg-slate-50 animate-pulse" />
                  ) : topGoals.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Chưa có mục tiêu nào đang theo dõi.{' '}
                      <Link href="/goals" className="text-teal-700 font-semibold hover:underline">
                        Tạo mục tiêu đầu tiên
                      </Link>
                    </p>
                  ) : (
                    topGoals.map((g) => {
                      const prog = Math.min(1, g.progress);
                      const safety = g.jar === 'SAFETY';
                      return (
                        <Link key={g.id} href="/goals" className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col gap-2.5 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <GoalIcon goal={g} size="md" />
                              <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-slate-900 truncate">{g.name}</p>
                                <p className="text-xs text-slate-500 fin-num">
                                  Đạt {formatVND(g.current)} / {formatVND(g.targetAmount)}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold fin-num shrink-0 ${safety ? 'bg-emerald-600 text-white' : 'bg-teal-700 text-white'}`}>{Math.floor(prog * 100)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white overflow-hidden" role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name}: tiến độ`}>
                            <div className={`h-full rounded-full ${safety ? 'bg-emerald-600' : 'bg-teal-700'}`} style={{ width: `${prog * 100}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 fin-num">
                            <span>
                              Còn thiếu: <b className="text-slate-900">{formatVND(g.remaining)}</b>
                            </span>
                            <span>{g.projectedMonth ? `Dự kiến: ${formatMonthLabel(g.projectedMonth)}` : g.deadline ? `Hạn: ${formatVNDate(g.deadline)}` : 'Chưa có kế hoạch nạp'}</span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                  {goalsPage && (
                    // Chân thẻ dính đáy: tổng quan quỹ + lối tắt, lấp phần cột phải còn trống
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-600">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="fin-num">
                          Đang nằm trong các quỹ: <b className="text-slate-900">{formatVND(goalsPage.overview.totalBalance)}</b>
                        </span>
                        <span className="fin-num">
                          Tháng này đã để dành <b className={goalsPage.overview.savedThisMonth >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatVND(goalsPage.overview.savedThisMonth)}</b>
                          {goalsPage.overview.statusCounts.on_track > 0 && <> · {goalsPage.overview.statusCounts.on_track} mục tiêu đúng lộ trình</>}
                        </span>
                      </div>
                      <Link href="/goals" className="fin-btn fin-btn-outline fin-btn-sm text-teal-700 shrink-0">
                        <Plus className="w-3.5 h-3.5" aria-hidden /> Mục tiêu
                      </Link>
                    </div>
                  )}
                </section>
              </div>
            </section>

            {/* Hàng dưới: giao dịch gần đây (8) + tài khoản (4) */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
              <section className="xl:col-span-8 fin-card p-4 md:p-5 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-[16px] font-semibold text-slate-900">Giao dịch gần đây</h2>
                  <Link href="/transactions" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline self-start sm:self-auto">
                    Xem tất cả <ChevronRight className="w-4 h-4" aria-hidden />
                  </Link>
                </div>
                {data.recent.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">Chưa có giao dịch nào</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.recent.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon icon={t.category?.icon} color={t.category?.color} size="lg" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm font-semibold text-slate-900 truncate max-w-[32ch]" title={t.content}>
                                {t.content || '(không có nội dung)'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium shrink-0" style={{ backgroundColor: `${t.category?.color ?? '#6e7977'}1f`, color: t.category?.color ?? '#3e4947' }}>
                                {t.category?.name ?? 'Chưa phân loại'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-mono shrink-0">{SOURCE_LABEL[t.source]}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {formatVNDateTime(t.transactionDate)} • {t.account.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className={`text-[15px] font-bold fin-num ${t.direction === 'IN' ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {t.direction === 'IN' ? '+' : '−'}
                            {formatVND(t.amount)}
                          </p>
                          <span className={`text-[11px] ${CATEGORIZED_LABEL[t.categorizedBy].className}`}>{t.excludeFromStats ? 'Loại khỏi thống kê' : CATEGORIZED_LABEL[t.categorizedBy].text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="xl:col-span-4 flex flex-col gap-4">
                <section className="fin-card p-4 md:p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-900">Tài khoản & Thẻ liên kết</h2>
                    <Link href="/accounts" className="text-xs font-semibold text-teal-700 hover:underline">
                      Quản lý
                    </Link>
                  </div>
                  {data.balances.map((a) => {
                    const brand = bankBrand(a.bankName ?? a.name);
                    const tail = a.accountNumber ? `••••${a.accountNumber.slice(-4)}` : null;
                    return (
                      <Link key={a.id} href={`/transactions${qs({ accountId: a.id })}`} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 flex items-center justify-between gap-3 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {a.type === 'CASH' ? (
                            <span className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                              <Wallet className="w-4 h-4" aria-hidden />
                            </span>
                          ) : (
                            <span className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: `${brand.color}1f`, color: brand.color }}>
                              {brand.short}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{[tail, a.tracking.label].filter(Boolean).join(' • ')}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[15px] font-bold fin-num ${a.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatVND(a.balance)}</p>
                          <span className={`text-[11px] inline-flex items-center justify-end gap-1 ${a.tracking.method === 'EMAIL' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {a.tracking.method === 'EMAIL' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />}
                            {a.tracking.method === 'EMAIL' ? 'Email tự động' : 'Nhập tay'}
                          </span>
                        </div>
                      </Link>
                    );
                  })}

                  {email && (
                    <div className={`p-3 rounded-lg flex items-start gap-2.5 text-xs leading-relaxed ${email.configured && !email.lastRun?.error ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      {email.configured && !email.lastRun?.error ? <MailCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden /> : <MailWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />}
                      <div className="min-w-0">
                        {!email.configured ? (
                          <>
                            <p className="font-semibold text-amber-800">Chưa kết nối hộp thư ngân hàng</p>
                          </>
                        ) : email.lastRun?.error ? (
                          <>
                            <p className="font-semibold text-amber-800">Lần đọc email gần nhất gặp lỗi</p>
                            <p className="text-slate-600 break-words">{email.lastRun.error}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-emerald-700">Hộp thư hoạt động tốt</p>
                            <p className="text-slate-600 fin-num">
                              {email.lastRun ? `Đọc lúc ${formatVNDateTime(email.lastRun.at)} · ${email.lastRun.created} giao dịch mới` : `Tự đọc mỗi ${email.pollMinutes} phút`}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </section>

              </div>
            </section>

            {/* Hàng phụ: thu theo nguồn, chi theo thứ, khoản chi lớn */}
            <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <ChartCard
                className="fin-card !bg-white !border-slate-200 !rounded-2xl !shadow-none"
                title="Thu theo nguồn"
                subtitle={`${s.incomeCount} giao dịch trong kỳ`}
                table={<DataTable head={['Danh mục', 'Số tiền', 'Số GD']} rows={data.incomeByCategory.map((c) => [c.name, formatVND(c.total), c.count])} />}
              >
                <CategoryBreakdown data={data.incomeByCategory} barColor={CHART.income} limit={6} onSelect={(id) => (window.location.href = txnLink({ direction: 'IN', categoryId: id ?? 'none' }))} />
              </ChartCard>
              <ChartCard className="fin-card !bg-white !border-slate-200 !rounded-2xl !shadow-none" title="Chi trung bình theo thứ" table={<WeekdayTable data={weekdayData} />}>
                <WeekdayChart data={weekdayData} />
              </ChartCard>
              <ChartCard className="fin-card !bg-white !border-slate-200 !rounded-2xl !shadow-none" title="10 khoản chi lớn nhất">
                <TxnMiniList items={data.topExpenses} empty="Không có khoản chi nào" />
              </ChartCard>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Thành phần nhỏ ───

function Kpi({ label, icon, iconClass, accent, children }: { label: string; icon: React.ReactNode; iconClass: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="fin-card fin-card-hover group relative overflow-hidden p-4 md:p-5 flex flex-col justify-between gap-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="fin-label">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`} aria-hidden>
          {icon}
        </span>
      </div>
      {children}
      <span className={`absolute bottom-0 left-0 right-0 h-1 transition-colors ${accent}`} aria-hidden />
    </div>
  );
}

function Amount({ value, signed, className = 'text-slate-900' }: { value: number; signed?: boolean; className?: string }) {
  return (
    <p className={`my-2 text-[28px] leading-9 font-bold tracking-[-0.02em] fin-num ${className}`} title={formatVND(value)}>
      {signed && value > 0 ? '+' : ''}
      {nf.format(value)} <span className="text-lg font-semibold opacity-60">₫</span>
    </p>
  );
}

// Thay đổi so với kỳ trước: màu theo "tăng là tốt hay xấu"; có thể kèm chênh lệch tuyệt đối
function Delta({ value, upIsGood, amount }: { value: number | null; upIsGood: boolean; amount?: number }) {
  if (value === null) return <span className="text-[11px] text-slate-400">Kỳ trước: 0 ₫</span>;
  const flat = Math.abs(value) < 0.005;
  const up = value > 0;
  const good = flat ? null : up === upIsGood;
  const Icon = flat ? ArrowRight : up ? TrendingUp : TrendingDown;
  const cls = good === null ? 'bg-slate-100 text-slate-600' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600';
  const signedPct = `${up ? '+' : ''}${pct(value)}`;
  // Chi tiêu: "Giảm 1,35 tr ₫ (-8,4%)"; thu nhập: "+12,0%"
  const text = flat
    ? 'Không đổi'
    : amount !== undefined
      ? `${up ? 'Tăng' : 'Giảm'} ${formatCompactVND(Math.abs(amount))} ₫ (${signedPct})`
      : signedPct;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold fin-num whitespace-nowrap ${cls}`} title="So với kỳ trước">
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {text}
    </span>
  );
}

// Phân bổ chi tiêu theo danh mục cha: thanh tỷ trọng + cảnh báo chạm/vượt hạn mức
function AllocationCard({
  rows,
  total,
  alerts,
  onSelect,
}: {
  rows: CategoryTotal[];
  total: number;
  alerts: { categoryId: number; percent: number | null }[];
  onSelect: (id: number | null) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const head = sorted.slice(0, 6);
  const tail = sorted.slice(6);
  const items: CategoryTotal[] = tail.length
    ? [...head, { categoryId: -1, name: `Khác (${tail.length} danh mục)`, icon: 'Ellipsis', color: '#6e7977', total: tail.reduce((s, d) => s + d.total, 0), count: tail.reduce((s, d) => s + d.count, 0) }]
    : head;
  const max = Math.max(1, ...items.map((i) => i.total));
  const alertOf = (id: number | null) => alerts.find((a) => a.categoryId === id);

  return (
    <section className="fin-card p-4 md:p-5 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">Phân bổ chi tiêu</h2>
          <p className="text-xs text-slate-500 fin-num">Tổng chi: {formatVND(total)}</p>
        </div>
        <PieChart className="w-5 h-5 text-slate-300" aria-hidden />
      </div>
      {items.length === 0 || total === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">Chưa có khoản chi nào trong kỳ</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => {
            const share = r.total / total;
            const alert = alertOf(r.categoryId);
            const clickable = r.categoryId !== -1;
            return (
              <li key={r.categoryId ?? 'none'}>
                <button type="button" disabled={!clickable} onClick={() => clickable && onSelect(r.categoryId)} className={`w-full text-left flex flex-col gap-1.5 rounded-lg -mx-1 px-1 ${clickable ? 'hover:bg-slate-50' : 'cursor-default'}`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} aria-hidden />
                      <span className="font-medium text-slate-900 truncate">{r.name}</span>
                      {alert && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${(alert.percent ?? 0) >= 1 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>
                          {(alert.percent ?? 0) >= 1 ? `+${pct((alert.percent ?? 0) - 1)} trần` : `${pct(alert.percent)} trần`}
                        </span>
                      )}
                    </span>
                    <span className="fin-num font-semibold text-slate-900 whitespace-nowrap">
                      {formatVND(r.total)} <span className="text-slate-500 font-normal text-[11px]">({pct(share)})</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.total / max) * 100)}%`, backgroundColor: alert && (alert.percent ?? 0) >= 1 ? '#cc1e44' : r.color }} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/budgets" className="fin-btn fin-btn-outline w-full justify-center text-teal-700">
        Xem chi tiết hạn mức ngân sách <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    </section>
  );
}
