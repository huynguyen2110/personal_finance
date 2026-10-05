'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Banknote, Download, Minus, PiggyBank, ShoppingBasket, TrendingDown, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import CategoryIcon from '@/components/shared/CategoryIcon';
import TreeSelect from '@/components/shared/TreeSelect';
import DatePicker from '@/components/shared/DatePicker';
import AccountSelect from '@/components/shared/AccountSelect';
import ChartCard, { DataTable } from '@/components/charts/ChartCard';
import CashflowCombo, { type ComboView } from '@/components/charts/CashflowCombo';
import TrendLines from '@/components/charts/TrendLines';
import { CHART } from '@/components/charts/theme';
import { CATEGORY_COLORS } from '@/components/shared/CategoryIcon';
import { useAccounts } from '@/modules/finance/accounts/lib';
import { errorMessage } from '@/lib/api-client';
import { formatCompactVND, formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel, formatMonthRange } from '@/lib/dates';
import { useMonthStartDay } from '@/modules/finance/settings/lib';
import { exportReport, useReport } from '../lib';
import type { ReportData, ReportRow as Row } from '../types';

const PRESETS = [
  { key: '6m', label: '6 tháng', range: (m: string) => [addMonths(m, -5), m] },
  { key: '12m', label: '12 tháng', range: (m: string) => [addMonths(m, -11), m] },
  { key: 'ytd', label: 'Năm nay', range: (m: string) => [`${m.slice(0, 4)}-01`, m] },
  { key: 'ly', label: 'Năm trước', range: (m: string) => [`${Number(m.slice(0, 4)) - 1}-01`, `${Number(m.slice(0, 4)) - 1}-12`] },
] as const;

const VIEWS: { key: ComboView; label: string }[] = [
  { key: 'flow', label: 'Thu nhập & Chi tiêu' },
  { key: 'savings', label: 'Xu hướng tích lũy' },
  { key: 'mix', label: 'Cơ cấu chi phí %' },
];

const nf = new Intl.NumberFormat('vi-VN');
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1).replace('.', ',')}%`);
const change = (cur: number, prev: number): number | null => (prev === 0 ? null : (cur - prev) / Math.abs(prev));

export default function ReportsPage() {
  // Tháng tài chính (ngày bắt đầu tháng trong cài đặt); mặc định 6 tháng gần nhất tới tháng hiện tại
  const sd = useMonthStartDay();
  const now = currentMonthVN(sd);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const fromMonth = range.from ?? addMonths(now, -5);
  const toMonth = range.to ?? now;
  const setFromMonth = (from: string) => setRange((r) => ({ from, to: r.to ?? now }));
  const setToMonth = (to: string) => setRange((r) => ({ from: r.from ?? addMonths(now, -5), to }));
  const [accountId, setAccountId] = useState<number | null>(null);
  const [view, setView] = useState<ComboView>('flow');
  const [matrixKind, setMatrixKind] = useState<'OUT' | 'IN'>('OUT');
  const [matrixMode, setMatrixMode] = useState<'value' | 'share'>('value');
  const [trendCategory, setTrendCategory] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const { data: accounts = [] } = useAccounts();

  // Khóa truy vấn so sánh theo giá trị nên không cần memo
  const params = { fromMonth, toMonth, accountId };
  const { data, isFetching: loading, error } = useReport(params, { enabled: fromMonth <= toMonth });

  useEffect(() => {
    if (error) toast.error(errorMessage(error));
  }, [error]);

  async function onExport() {
    setExporting(true);
    try {
      await exportReport(params);
    } catch (e) {
      toast.error(errorMessage(e, 'Không tải được file Excel'));
    } finally {
      setExporting(false);
    }
  }

  const insights = useMemo(() => (data ? deriveInsights(data) : null), [data]);
  const mix = useMemo(() => (data ? buildMix(data) : undefined), [data]);

  // Chế độ chỉ lấy email tiền đi: thu nhập là kế hoạch (hạn mức + tiết kiệm), không có danh mục thu
  const planned = data?.incomeMode === 'PLANNED';
  const rows = matrixKind === 'OUT' || planned ? (data?.expenseRows ?? []) : (data?.incomeRows ?? []);
  const trendRow: Row | undefined = data?.expenseRows.find((r) => String(r.categoryId) === trendCategory) ?? data?.expenseRows[0];
  const yoyData = data?.monthly.map((m) => ({ month: m.month, expense: m.expense, prevYearExpense: m.prevYearExpense })) ?? [];
  const hasPrevYear = data?.monthly.some((m) => m.prevYearExpense > 0 || m.prevYearIncome > 0);

  return (
    <div className="font-jakarta">
      <Header
        title="Thống kê & So sánh"
        subtitle={`${formatMonthLabel(fromMonth)} – ${formatMonthLabel(toMonth)}${sd > 1 ? ` · tháng tính từ ngày ${sd} (${formatMonthLabel(toMonth)} = ${formatMonthRange(toMonth, sd)})` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200" role="group" aria-label="Kỳ nhanh">
              {PRESETS.map((p) => {
                const [f, t] = p.range(now);
                const active = f === fromMonth && t === toMonth;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setFromMonth(f);
                      setToMonth(t);
                    }}
                    aria-pressed={active}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <DatePicker mode="month" ariaLabel="Từ tháng" value={fromMonth} max={toMonth} onChange={(v) => v && setFromMonth(v)} />
            <span className="text-slate-400 text-sm" aria-hidden>
              →
            </span>
            <DatePicker mode="month" ariaLabel="Đến tháng" value={toMonth} min={fromMonth} onChange={(v) => v && setToMonth(v)} />
            <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} allLabel="Tất cả tài khoản" className="!w-auto min-w-[12rem]" />
            <button type="button" className="fin-btn fin-btn-outline" onClick={onExport} disabled={exporting}>
              <Download className="w-4 h-4 text-slate-400" aria-hidden /> {exporting ? 'Đang xuất…' : 'Xuất Excel'}
            </button>
          </div>
        }
      />

      <div className={`px-4 md:px-6 pb-8 flex flex-col gap-4 md:gap-6 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {!data || !insights ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fin-card h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* 4 KPI */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Kpi label={planned ? 'Thu nhập tự tính kỳ' : 'Tổng thu nhập kỳ'} icon={<Banknote className="w-[18px] h-[18px]" />} iconClass="bg-teal-50 text-teal-700" badge={<MoM value={insights.incomeMoM} upIsGood />}>
                <Big value={data.summary.income} />
                <Foot>
                  <span>
                    TB: <b className="text-slate-900 fin-num">{formatVND(Math.round(data.summary.income / data.monthCount))}</b>/tháng
                  </span>
                  <span className="fin-label">{planned ? 'Hạn mức + tiết kiệm đã nạp' : `${data.monthCount} chu kỳ`}</span>
                </Foot>
              </Kpi>

              <Kpi label="Tổng chi tiêu kỳ" icon={<ShoppingBasket className="w-[18px] h-[18px]" />} iconClass="bg-rose-50 text-rose-600" badge={<MoM value={insights.expenseMoM} upIsGood={false} />}>
                <Big value={data.summary.expense} />
                <Foot>
                  <span>
                    TB: <b className="text-slate-900 fin-num">{formatVND(Math.round(data.summary.expense / data.monthCount))}</b>/tháng
                  </span>
                  <span className={`fin-label ${insights.expenseShare !== null && insights.expenseShare > 1 ? '!text-rose-600' : '!text-emerald-700'}`}>
                    {insights.expenseShare !== null ? `${pct(insights.expenseShare)} thu nhập` : 'Chưa có thu nhập'}
                  </span>
                </Foot>
              </Kpi>

              <Kpi
                label="Tích lũy ròng"
                icon={<PiggyBank className="w-[18px] h-[18px]" />}
                iconClass="bg-emerald-50 text-emerald-700"
                badge={<span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold fin-num whitespace-nowrap">Tỷ lệ {pct(data.summary.savingsRate)}</span>}
              >
                <Big value={data.summary.net} signed className={data.summary.net >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
                <Foot>
                  <span>
                    Tháng thặng dư: <b className="text-slate-900 fin-num">{insights.positiveMonths}/{data.monthCount}</b>
                  </span>
                  <span className={`fin-label ${data.summary.net >= 0 ? '!text-emerald-700' : '!text-rose-600'}`}>{data.summary.net >= 0 ? 'Thặng dư' : 'Thâm hụt'}</span>
                </Foot>
              </Kpi>
            </section>

            {/* Biểu đồ kết hợp */}
            <section className="fin-card p-4 md:p-6 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[18px] font-semibold text-slate-900 tracking-[-0.01em]">Biểu đồ so sánh dòng tiền & tỷ lệ tiết kiệm</h2>
                    <span className="fin-label px-2 py-0.5 rounded bg-slate-100">{data.monthCount} tháng</span>
                  </div>
                </div>
                {/* Màn hẹp: 3 cột đều, nhãn được xuống dòng thay vì tràn khỏi thẻ */}
                <div className="grid grid-cols-3 w-full lg:inline-flex lg:w-auto lg:shrink-0 items-stretch p-0.5 rounded-lg bg-slate-100 border border-slate-200 self-start" role="tablist" aria-label="Chế độ xem">
                  {VIEWS.map((v) => (
                    <button key={v.key} type="button" role="tab" aria-selected={view === v.key} onClick={() => setView(v.key)} className={`min-w-0 px-2 sm:px-3 py-1 rounded-md text-xs leading-tight font-semibold text-center transition-colors lg:whitespace-nowrap ${view === v.key ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <CashflowCombo
                data={data.monthly}
                view={view}
                benchmark={insights.avgExpense > 0 ? { value: insights.avgExpense, label: `Chi trung bình: ${formatCompactVND(insights.avgExpense)} ₫` } : null}
                mix={mix}
                height={320}
              />
            </section>

            {/* Ma trận danh mục × tháng */}
            <section className="fin-card overflow-hidden">
              <div className="p-4 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[18px] font-semibold text-slate-900 tracking-[-0.01em]">Ma trận phân bổ {matrixKind === 'OUT' || planned ? 'chi tiêu' : 'thu nhập'} theo danh mục</h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 ${planned ? 'hidden' : 'inline-flex'}`} role="tablist" aria-label="Loại dòng tiền">
                    {(['OUT', 'IN'] as const).map((k) => (
                      <button key={k} type="button" role="tab" aria-selected={matrixKind === k} onClick={() => setMatrixKind(k)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${matrixKind === k ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        {k === 'OUT' ? 'Chi tiêu' : 'Thu nhập'}
                      </button>
                    ))}
                  </div>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200" role="tablist" aria-label="Cách hiển thị">
                    {(
                      [
                        ['value', 'Theo giá trị (₫)'],
                        ['share', '% Tỷ trọng'],
                      ] as const
                    ).map(([k, label]) => (
                      <button key={k} type="button" role="tab" aria-selected={matrixMode === k} onClick={() => setMatrixMode(k)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${matrixMode === k ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Matrix months={data.months} rows={rows} color={matrixKind === 'OUT' || planned ? CHART.expense : CHART.income} mode={matrixMode} upIsGood={matrixKind === 'IN' && !planned} />
            </section>

            {/* Hàng cuối: cùng kỳ năm trước, xu hướng một danh mục, tổng hợp tháng */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
              <ChartCard
                className="fin-card !bg-white !border-slate-200 !rounded-2xl !shadow-none"
                title="Chi tiêu so với cùng kỳ năm trước"
                subtitle={hasPrevYear ? undefined : 'Chưa có dữ liệu năm trước'}
                table={<DataTable head={['Tháng', 'Năm nay', 'Năm trước', 'Chênh lệch']} rows={yoyData.map((d) => [formatMonthLabel(d.month), formatVND(d.expense), formatVND(d.prevYearExpense), formatVND(d.expense - d.prevYearExpense)])} />}
              >
                <TrendLines
                  data={yoyData}
                  xKey="month"
                  height={240}
                  series={[
                    { key: 'expense', label: 'Kỳ này', color: CHART.expense },
                    { key: 'prevYearExpense', label: 'Cùng kỳ năm trước', color: CHART.muted },
                  ]}
                />
              </ChartCard>

              <ChartCard
                className="fin-card !bg-white !border-slate-200 !rounded-2xl !shadow-none"
                title="Xu hướng một danh mục chi"
                actions={
                  <div className="w-52">
                    <TreeSelect
                      ariaLabel="Chọn danh mục"
                      size="sm"
                      options={data.expenseRows.map((r) => ({
                        value: String(r.categoryId),
                        label: r.name,
                        depth: r.parentId !== null ? (1 as const) : (0 as const),
                        icon: <CategoryIcon icon={r.icon} color={r.color} size="sm" />,
                      }))}
                      value={trendRow ? String(trendRow.categoryId) : null}
                      onChange={(v) => v !== null && setTrendCategory(v)}
                    />
                  </div>
                }
                table={trendRow && <DataTable head={['Tháng', trendRow.name]} rows={data.months.map((m, i) => [formatMonthLabel(m), formatVND(trendRow.values[i])])} />}
              >
                {trendRow ? (
                  <>
                    <p className="text-xs text-slate-500 mb-2 fin-num">
                      Trung bình {formatVND(Math.round(trendRow.average))}/tháng · Tổng {formatVND(trendRow.total)}
                    </p>
                    <TrendLines data={data.months.map((m, i) => ({ month: m, value: trendRow.values[i] }))} xKey="month" height={212} series={[{ key: 'value', label: trendRow.name, color: CHART.expense }]} />
                  </>
                ) : (
                  <p className="text-sm text-slate-500 py-8 text-center">Chưa có dữ liệu</p>
                )}
              </ChartCard>

              <section className="fin-card p-4 md:p-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Tổng hợp theo tháng</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm fin-num">
                    <thead>
                      <tr className="text-left">
                        <th className="fin-label px-2 py-2 font-bold">Tháng</th>
                        <th className="fin-label px-2 py-2 text-right font-bold">Thu</th>
                        <th className="fin-label px-2 py-2 text-right font-bold">Chi</th>
                        <th className="fin-label px-2 py-2 text-right font-bold">Còn lại</th>
                        <th className="fin-label px-2 py-2 text-right font-bold">Tiết kiệm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.monthly.map((m) => (
                        <tr key={m.month} className="hover:bg-slate-50">
                          <td className="px-2 py-1.5 text-slate-900 font-medium">{formatMonthLabel(m.month)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-600">{formatCompactVND(m.income)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-600">{formatCompactVND(m.expense)}</td>
                          <td className={`px-2 py-1.5 text-right font-semibold ${m.net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCompactVND(m.net)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-500">{pct(m.savingsRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Số liệu dẫn xuất ───

interface Insights {
  incomeMoM: number | null;
  expenseMoM: number | null;
  expenseShare: number | null;
  positiveMonths: number;
  avgExpense: number;
}

function deriveInsights(data: ReportData): Insights {
  const ms = data.monthly;
  const last = ms[ms.length - 1];
  const prev = ms[ms.length - 2];
  const withExpense = ms.filter((m) => m.expense > 0);
  return {
    incomeMoM: last && prev ? change(last.income, prev.income) : null,
    expenseMoM: last && prev ? change(last.expense, prev.expense) : null,
    expenseShare: data.summary.income > 0 ? data.summary.expense / data.summary.income : null,
    positiveMonths: ms.filter((m) => m.net > 0).length,
    avgExpense: withExpense.length ? withExpense.reduce((acc, m) => acc + m.expense, 0) / withExpense.length : 0,
  };
}

// Cơ cấu chi phí theo tháng: 5 danh mục cha lớn nhất + "Khác"
function buildMix(data: ReportData) {
  const tops = data.expenseRows.filter((r) => r.parentId === null).sort((a, b) => b.total - a.total);
  const head = tops.slice(0, 5);
  const tail = tops.slice(5);
  const series = [
    ...head.map((r, i) => ({ key: `c${r.categoryId ?? 'none'}`, label: r.name, color: r.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    ...(tail.length ? [{ key: 'other', label: `Khác (${tail.length})`, color: '#bdc9c6' }] : []),
  ];
  const rows = data.months.map((m, i) => {
    const point: Record<string, number | string> = { month: m };
    head.forEach((r) => (point[`c${r.categoryId ?? 'none'}`] = r.values[i]));
    if (tail.length) point.other = tail.reduce((s, r) => s + r.values[i], 0);
    return point;
  });
  return { data: rows, series };
}

// ─── Thành phần nhỏ ───

function Kpi({ label, icon, iconClass, badge, children }: { label: string; icon: React.ReactNode; iconClass: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fin-card fin-card-hover p-4 md:p-5 flex flex-col justify-between gap-1 min-w-0 h-full">
      <div>
        {/* flex-wrap: màn hẹp thì huy hiệu xuống dòng thay vì cắt mất nhãn */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`} aria-hidden>
              {icon}
            </span>
            <span className="fin-label">{label}</span>
          </div>
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}

function Big({ value, signed, className = 'text-slate-900' }: { value: number; signed?: boolean; className?: string }) {
  return (
    <p className={`text-2xl lg:text-[28px] leading-9 font-bold tracking-[-0.02em] fin-num whitespace-nowrap ${className}`} title={formatVND(value)}>
      {signed && value > 0 ? '+' : ''}
      {nf.format(value)} <span className="text-base lg:text-lg font-semibold opacity-60">₫</span>
    </p>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3 text-xs text-slate-600">{children}</div>;
}

// Thay đổi tháng gần nhất so với tháng trước đó
function MoM({ value, upIsGood }: { value: number | null; upIsGood: boolean }) {
  if (value === null) return <span className="fin-label whitespace-nowrap">Tháng trước: 0 ₫</span>;
  const flat = Math.abs(value) < 0.005;
  const up = value > 0;
  const good = flat ? null : up === upIsGood;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const cls = good === null ? 'bg-slate-100 text-slate-600' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600';
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold fin-num whitespace-nowrap ${cls}`} title="Tháng gần nhất so với tháng trước đó">
      <Icon className="w-3 h-3" aria-hidden />
      {flat ? '0%' : `${up ? '+' : ''}${pct(value)}`} MoM
    </span>
  );
}


// Bảng danh mục × tháng. Dòng cha gộp con; dòng con thụt vào. Cột tháng gần nhất tô nền; cuối hàng là biến động MoM.
function Matrix({ months, rows, color, mode, upIsGood }: { months: string[]; rows: Row[]; color: string; mode: 'value' | 'share'; upIsGood: boolean }) {
  if (!rows.length) return <p className="p-8 text-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này</p>;
  const tops = rows.filter((r) => r.parentId === null);
  const colTotals = months.map((_, i) => tops.reduce((s, r) => s + r.values[i], 0));
  const grand = colTotals.reduce((s, v) => s + v, 0);
  const max = Math.max(...tops.flatMap((r) => r.values), 1);
  const lastIdx = months.length - 1;
  const alpha = (v: number) => (v <= 0 ? 0 : 0.1 + 0.45 * (v / max));
  const cell = (v: number, i: number) => (mode === 'value' ? (v ? formatCompactVND(v) : '·') : colTotals[i] > 0 && v ? pct(v / colTotals[i]) : '·');
  const parentName = (r: Row) => rows.find((p) => p.categoryId === r.parentId)?.name;
  // "Chưa phân loại" (categoryId null) không có con; dòng con luôn có parentId khác null
  const childCount = (r: Row) => (r.categoryId === null ? 0 : rows.filter((c) => c.parentId !== null && c.parentId === r.categoryId).length);
  const momOf = (values: number[]) => (lastIdx >= 1 ? change(values[lastIdx], values[lastIdx - 1]) : null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-y border-slate-200 text-left">
            <th className="fin-label py-3 px-3 sm:px-4 md:px-6 w-px sm:w-auto sm:min-w-[220px] sticky left-0 z-10 bg-slate-50 font-bold">Danh mục</th>
            {months.map((m, i) => (
              <th key={m} className={`fin-label py-3 px-3 text-right whitespace-nowrap font-bold ${i === lastIdx ? 'bg-teal-50 !text-teal-800' : ''}`}>
                {formatMonthLabel(m)}
              </th>
            ))}
            <th className="fin-label py-3 px-4 text-right whitespace-nowrap font-bold">Tổng kỳ</th>
            <th className="fin-label py-3 px-4 text-right whitespace-nowrap font-bold">Biến động MoM</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const child = r.parentId !== null;
            const mom = momOf(r.values);
            return (
              <tr key={String(r.categoryId)} className={`hover:bg-slate-50/70 transition-colors ${child ? 'bg-slate-50/40' : ''}`}>
                {/* Cột cố định: màn hẹp thu gọn (ẩn icon, giới hạn bề rộng, cắt tên) để còn chỗ cho số liệu */}
                <td className={`py-3 px-3 sm:px-4 md:px-6 sticky left-0 z-10 ${child ? 'bg-[#FAFBFD] pl-6 sm:pl-10 md:pl-12' : 'bg-white'}`} title={r.name}>
                  <span className="flex items-center gap-2 sm:gap-3 min-w-0 w-28 sm:w-auto">
                    {child && <span className="text-slate-300 -ml-4 hidden sm:inline" aria-hidden>└</span>}
                    <span className="hidden sm:contents">
                      <CategoryIcon icon={r.icon} color={r.color} size={child ? 'sm' : 'md'} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate ${child ? 'text-slate-700 text-[13px]' : 'text-slate-900 font-semibold'}`}>{r.name}</span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {child ? `Thuộc ${parentName(r) ?? '…'}` : childCount(r) ? `${childCount(r)} danh mục con · TB ${formatCompactVND(Math.round(r.average))} ₫/tháng` : `TB ${formatCompactVND(Math.round(r.average))} ₫/tháng`}
                      </span>
                    </span>
                  </span>
                </td>
                {r.values.map((v, i) => (
                  <td key={months[i]} className={`py-3 px-3 text-right fin-num whitespace-nowrap ${i === lastIdx ? 'bg-teal-50/60 font-semibold text-teal-900' : 'text-slate-800'}`} title={`${formatVND(v)}${colTotals[i] ? ` · ${pct(v / colTotals[i])} của tháng` : ''}`}>
                    <span className="inline-block rounded px-1.5 py-0.5 min-w-14" style={{ backgroundColor: i === lastIdx ? 'transparent' : `color-mix(in srgb, ${color} ${Math.round(alpha(v) * 100)}%, transparent)` }}>
                      {cell(v, i)}
                    </span>
                  </td>
                ))}
                <td className={`py-3 px-4 text-right fin-num whitespace-nowrap ${child ? 'text-slate-700' : 'font-bold text-slate-900'}`}>{mode === 'value' ? formatCompactVND(r.total) : grand ? pct(r.total / grand) : '·'}</td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <MomBadge value={mom} upIsGood={upIsGood} prevZero={lastIdx >= 1 && r.values[lastIdx - 1] === 0 && r.values[lastIdx] > 0} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
            <th scope="row" className="py-3.5 px-3 sm:px-4 md:px-6 text-left sticky left-0 z-10 bg-slate-50 sm:whitespace-nowrap text-xs uppercase tracking-wider">Tổng {upIsGood ? 'thu' : 'chi'} hàng tháng</th>
            {colTotals.map((v, i) => (
              <td key={months[i]} className={`py-3.5 px-3 text-right fin-num whitespace-nowrap ${i === lastIdx ? 'bg-teal-100/60 text-teal-900' : ''}`}>
                {mode === 'value' ? formatCompactVND(v) : v ? '100%' : '·'}
              </td>
            ))}
            <td className={`py-3.5 px-4 text-right fin-num whitespace-nowrap ${upIsGood ? 'text-emerald-700' : 'text-rose-600'}`}>{mode === 'value' ? formatCompactVND(grand) : '100%'}</td>
            <td className="py-3.5 px-4 text-right whitespace-nowrap">
              <MomBadge value={momOf(colTotals)} upIsGood={upIsGood} prevZero={lastIdx >= 1 && colTotals[lastIdx - 1] === 0 && colTotals[lastIdx] > 0} strong />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MomBadge({ value, upIsGood, prevZero, strong }: { value: number | null; upIsGood: boolean; prevZero: boolean; strong?: boolean }) {
  const base = `inline-flex items-center gap-0.5 rounded-full text-[11px] fin-num whitespace-nowrap ${strong ? 'px-2.5 py-1 font-bold' : 'px-2 py-0.5 font-semibold'}`;
  if (prevZero) return <span className={`${base} bg-slate-100 text-slate-600`}>Mới phát sinh</span>;
  if (value === null) return <span className={`${base} bg-slate-100 text-slate-400`}>—</span>;
  const flat = Math.abs(value) < 0.005;
  if (flat) return <span className={`${base} bg-slate-100 text-slate-600`}>0% Không đổi</span>;
  const up = value > 0;
  const good = up === upIsGood;
  const big = Math.abs(value) >= 0.3;
  return (
    <span className={`${base} ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
      {up ? <ArrowUp className="w-3 h-3" aria-hidden /> : <ArrowDown className="w-3 h-3" aria-hidden />}
      {pct(Math.abs(value))}
      {good && big ? ' (Tốt)' : !good && big ? ' (Chú ý)' : ''}
    </span>
  );
}
