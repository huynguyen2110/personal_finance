'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CircleHelp, Info, Landmark, TriangleAlert, Wallet } from 'lucide-react';
import Header from '@/components/layout/Header';
import PeriodFilter from '@/components/shared/PeriodFilter';
import StatTile from '@/components/shared/StatTile';
import TxnMiniList from '@/components/shared/TxnMiniList';
import { BudgetBadge, BudgetBar } from '@/components/shared/BudgetStatus';
import ChartCard, { DataTable } from '@/components/charts/ChartCard';
import MonthlyBars, { MonthlyTable } from '@/components/charts/MonthlyBars';
import CumulativeChart, { CumulativeTable } from '@/components/charts/CumulativeChart';
import CategoryBreakdown from '@/components/charts/CategoryBreakdown';
import WeekdayChart, { WeekdayTable, type WeekdayDatum } from '@/components/charts/WeekdayChart';
import { CHART } from '@/components/charts/theme';
import { usePeriod } from '@/hooks/usePeriod';
import { useAccounts } from '@/hooks/useMeta';
import { api, qs } from '@/lib/client';
import { formatVND } from '@/lib/money';
import { addDaysStr, daysBetween, formatMonthLabel, formatVNDate, weekdayOf } from '@/lib/dates';
import type { getDashboard } from '@/lib/reports';
import type { AccountDTO, TransactionDTO } from '@/lib/types';

type Raw = Awaited<ReturnType<typeof getDashboard>>;
type DashboardData = Omit<Raw, 'topExpenses' | 'recent' | 'balances'> & {
  topExpenses: TransactionDTO[];
  recent: TransactionDTO[];
  balances: AccountDTO[];
};

function change(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

function pct(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(1).replace('.', ',')}%`;
}

export default function DashboardPage() {
  const { ready, preset, period, accountId, setPreset, setCustom, setAccountId } = usePeriod('this_month');
  const { accounts } = useAccounts();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- giữ bản cũ (mờ) trong lúc tải lại
    setLoading(true);
    api<DashboardData>(`/api/stats/dashboard${qs({ from: period.from, to: period.to, accountId })}`)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => toast.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ready, period.from, period.to, accountId]);

  // Chi trung bình theo thứ = tổng chi thứ đó / số ngày thứ đó trong kỳ
  const weekdayData: WeekdayDatum[] = useMemo(() => {
    if (!data) return [];
    const counts = Array(7).fill(0);
    const n = Math.min(daysBetween(data.period.from, data.period.to), 800);
    for (let i = 0; i < n; i++) {
      counts[weekdayOf(addDaysStr(data.period.from, i))]++;
    }
    return data.weekday.map((w) => ({
      weekday: w.weekday,
      total: w.expense,
      days: counts[w.weekday],
      average: counts[w.weekday] ? w.expense / counts[w.weekday] : 0,
    }));
  }, [data]);

  const s = data?.summary;
  const p = data?.prevSummary;
  const txnLink = (extra: Record<string, string | number | null>) =>
    `/transactions${qs({ from: period.from, to: period.to, accountId, ...extra })}`;

  return (
    <div>
      <Header
        title="Tổng quan"
        subtitle={`${formatVNDate(period.from)} – ${formatVNDate(period.to)}`}
        actions={
          <PeriodFilter
            preset={preset}
            period={period}
            onPreset={setPreset}
            onCustom={setCustom}
            accounts={accounts}
            accountId={accountId}
            onAccount={setAccountId}
          />
        }
      />

      <div className={`px-4 md:px-6 pb-8 space-y-4 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {!data ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-card h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatTile label="Tổng thu" value={formatVND(s!.income)} delta={change(s!.income, p!.income)} accent={CHART.income} />
              <StatTile
                label="Tổng chi"
                value={formatVND(s!.expense)}
                delta={change(s!.expense, p!.expense)}
                upIsGood={false}
                accent={CHART.expense}
              />
              <StatTile label="Chênh lệch (thu − chi)" value={formatVND(s!.net)} delta={change(s!.net, p!.net)} />
              <StatTile
                label="Tỷ lệ tiết kiệm"
                value={pct(s!.savingsRate)}
                hint={p!.savingsRate !== null ? `Kỳ trước: ${pct(p!.savingsRate)}` : undefined}
              />
              <StatTile
                label="Tổng số dư hiện tại"
                value={formatVND(data.totalBalance)}
                hint={`${data.balances.length} tài khoản`}
              />
            </div>

            {/* Cảnh báo */}
            {(data.uncategorizedCount > 0 || data.budget.alerts.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {data.uncategorizedCount > 0 && (
                  <Link
                    href="/transactions?categoryId=none"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-text-secondary hover:border-primary/40"
                  >
                    <CircleHelp className="w-4 h-4 text-text-muted" />
                    <span>
                      <b className="text-text">{data.uncategorizedCount}</b> giao dịch chưa phân loại
                    </span>
                  </Link>
                )}
                {data.budget.alerts.map((a) => (
                  <Link
                    key={a.categoryId}
                    href="/budgets"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <TriangleAlert className="w-4 h-4" style={{ color: (a.percent ?? 0) >= 1 ? '#d03b3b' : '#ec835a' }} />
                    <span className="text-text">{a.name}</span>
                    <span className="text-text-secondary tabular">{pct(a.percent)} ngân sách</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ChartCard
                className="xl:col-span-2"
                title="Chi tiêu lũy kế"
                subtitle={
                  data.budget.showOnDailyChart
                    ? `So với kỳ trước và ngân sách ${formatMonthLabel(data.budget.month)} (${formatVND(data.budget.totalBudget)})`
                    : `So với kỳ trước (${formatVNDate(data.prevPeriod.from)} – ${formatVNDate(data.prevPeriod.to)})`
                }
                table={<CumulativeTable data={data.daily} />}
              >
                <CumulativeChart
                  data={data.daily}
                  budget={data.budget.showOnDailyChart ? data.budget.totalBudget : null}
                />
              </ChartCard>

              <ChartCard
                title="Chi theo danh mục"
                subtitle={`${s!.expenseCount} giao dịch · bấm để xem chi tiết`}
                table={
                  <DataTable
                    head={['Danh mục', 'Số tiền', 'Số GD']}
                    rows={data.expenseByCategory.map((c) => [c.name, formatVND(c.total), c.count])}
                  />
                }
              >
                <CategoryBreakdown
                  data={data.expenseByCategory}
                  barColor={CHART.expense}
                  onSelect={(id) => (window.location.href = txnLink({ direction: 'OUT', categoryId: id ?? 'none' }))}
                />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ChartCard
                className="xl:col-span-2"
                title="Thu chi 12 tháng"
                subtitle={`Đến ${formatMonthLabel(data.period.to.slice(0, 7))}`}
                table={<MonthlyTable data={data.monthly} />}
              >
                <MonthlyBars data={data.monthly} />
              </ChartCard>
              <ChartCard title="Chi trung bình theo thứ" subtitle="Trong kỳ đang xem" table={<WeekdayTable data={weekdayData} />}>
                <WeekdayChart data={weekdayData} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <ChartCard title="10 khoản chi lớn nhất" subtitle="Trong kỳ đang xem">
                <TxnMiniList items={data.topExpenses} empty="Không có khoản chi nào" />
              </ChartCard>

              <ChartCard
                title="Thu theo nguồn"
                subtitle={`${s!.incomeCount} giao dịch`}
                table={
                  <DataTable
                    head={['Danh mục', 'Số tiền', 'Số GD']}
                    rows={data.incomeByCategory.map((c) => [c.name, formatVND(c.total), c.count])}
                  />
                }
              >
                <CategoryBreakdown
                  data={data.incomeByCategory}
                  barColor={CHART.income}
                  limit={6}
                  onSelect={(id) => (window.location.href = txnLink({ direction: 'IN', categoryId: id ?? 'none' }))}
                />
              </ChartCard>

              <div className="space-y-4">
                <ChartCard title="Số dư tài khoản" actions={<Link href="/accounts" className="text-xs text-primary hover:underline">Quản lý</Link>}>
                  <ul className="divide-y divide-slate-100">
                    {data.balances.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-text-secondary">
                          {a.type === 'CASH' ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0 text-sm text-text truncate">{a.name}</span>
                        <span className="text-sm font-semibold text-text tabular">{formatVND(a.balance)}</span>
                      </li>
                    ))}
                  </ul>
                </ChartCard>

                <ChartCard
                  title={`Ngân sách ${formatMonthLabel(data.budget.month)}`}
                  actions={<Link href="/budgets" className="text-xs text-primary hover:underline">Chi tiết</Link>}
                >
                  {data.budget.totalBudget > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-text-secondary">
                          Đã chi <b className="text-text tabular">{formatVND(data.budget.totalSpent)}</b>
                        </span>
                        <span className="text-text-muted tabular">/ {formatVND(data.budget.totalBudget)}</span>
                      </div>
                      <BudgetBar percent={data.budget.totalSpent / data.budget.totalBudget} />
                      <BudgetBadge percent={data.budget.totalSpent / data.budget.totalBudget} />
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">
                      Chưa đặt ngân sách. <Link href="/budgets" className="text-primary hover:underline">Đặt ngay</Link>
                    </p>
                  )}
                </ChartCard>
              </div>
            </div>

            <ChartCard
              title="Giao dịch gần đây"
              actions={<Link href="/transactions" className="text-xs text-primary hover:underline">Xem tất cả</Link>}
            >
              <TxnMiniList items={data.recent} />
            </ChartCard>

            {data.expenseByCategory.length > 0 && (
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" aria-hidden />
                Chuyển khoản giữa các tài khoản của bạn được tự nhận diện và không tính vào thu chi, cùng các giao dịch bạn đánh dấu “loại khỏi thống kê”.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
