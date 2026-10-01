'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import Header from '@/components/layout/Header';
import StatTile from '@/components/shared/StatTile';
import CategoryIcon from '@/components/shared/CategoryIcon';
import TreeSelect from '@/components/shared/TreeSelect';
import DatePicker from '@/components/shared/DatePicker';
import AccountSelect from '@/components/shared/AccountSelect';
import ChartCard, { DataTable } from '@/components/charts/ChartCard';
import MonthlyBars, { MonthlyTable } from '@/components/charts/MonthlyBars';
import TrendLines from '@/components/charts/TrendLines';
import { CHART } from '@/components/charts/theme';
import { useAccounts } from '@/modules/accounts/lib';
import { errorMessage } from '@/lib/api-client';
import { formatCompactVND, formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel } from '@/lib/dates';
import { exportReport, useReport } from '../lib';
import type { ReportRow as Row } from '../types';

const PRESETS = [
  { key: '6m', label: '6 tháng', range: (m: string) => [addMonths(m, -5), m] },
  { key: '12m', label: '12 tháng', range: (m: string) => [addMonths(m, -11), m] },
  { key: 'ytd', label: 'Năm nay', range: (m: string) => [`${m.slice(0, 4)}-01`, m] },
  { key: 'ly', label: 'Năm trước', range: (m: string) => [`${Number(m.slice(0, 4)) - 1}-01`, `${Number(m.slice(0, 4)) - 1}-12`] },
] as const;

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1).replace('.', ',')}%`);

export default function ReportsPage() {
  const now = currentMonthVN();
  const [fromMonth, setFromMonth] = useState(addMonths(now, -5));
  const [toMonth, setToMonth] = useState(now);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [matrixKind, setMatrixKind] = useState<'OUT' | 'IN'>('OUT');
  const [trendCategory, setTrendCategory] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const { data: accounts = [] } = useAccounts();

  const params = useMemo(() => ({ fromMonth, toMonth, accountId }), [fromMonth, toMonth, accountId]);
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

  const rows = matrixKind === 'OUT' ? data?.expenseRows ?? [] : data?.incomeRows ?? [];
  const trendRow: Row | undefined =
    data?.expenseRows.find((r) => String(r.categoryId) === trendCategory) ?? data?.expenseRows[0];

  const yoyData = data?.monthly.map((m) => ({ month: m.month, expense: m.expense, prevYearExpense: m.prevYearExpense })) ?? [];
  const hasPrevYear = data?.monthly.some((m) => m.prevYearExpense > 0 || m.prevYearIncome > 0);

  return (
    <div>
      <Header
        title="Thống kê"
        subtitle={`${formatMonthLabel(fromMonth)} – ${formatMonthLabel(toMonth)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-surface-light p-1 border border-slate-200">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${active ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <DatePicker mode="month" ariaLabel="Từ tháng" value={fromMonth} max={toMonth} onChange={(v) => v && setFromMonth(v)} />
            <span className="text-text-muted text-sm" aria-hidden>→</span>
            <DatePicker mode="month" ariaLabel="Đến tháng" value={toMonth} min={fromMonth} onChange={(v) => v && setToMonth(v)} />
            <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} allLabel="Tất cả tài khoản" className="!w-auto min-w-[12rem]" />
            <button
              type="button"
              className="btn-secondary !py-2 text-sm flex items-center gap-1.5"
              onClick={onExport}
              disabled={exporting}
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
          </div>
        }
      />

      <div className={`px-4 md:px-6 pb-8 space-y-4 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {!data ? (
          <div className="glass-card h-40 animate-pulse" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatTile label="Tổng thu" value={formatVND(data.summary.income)} accent={CHART.income} />
              <StatTile label="Tổng chi" value={formatVND(data.summary.expense)} accent={CHART.expense} />
              <StatTile label="Thu trung bình / tháng" value={formatVND(Math.round(data.summary.income / data.monthCount))} />
              <StatTile label="Chi trung bình / tháng" value={formatVND(Math.round(data.summary.expense / data.monthCount))} />
              <StatTile label="Tỷ lệ tiết kiệm" value={pct(data.summary.savingsRate)} hint={`Tiết kiệm ${formatVND(data.summary.net)}`} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ChartCard title="Thu chi theo tháng" table={<MonthlyTable data={data.monthly} />}>
                <MonthlyBars data={data.monthly} />
              </ChartCard>
              <ChartCard
                title="Chi tiêu so với cùng kỳ năm trước"
                subtitle={hasPrevYear ? undefined : 'Chưa có dữ liệu năm trước'}
                table={
                  <DataTable
                    head={['Tháng', 'Năm nay', 'Năm trước', 'Chênh lệch']}
                    rows={yoyData.map((d) => [formatMonthLabel(d.month), formatVND(d.expense), formatVND(d.prevYearExpense), formatVND(d.expense - d.prevYearExpense)])}
                  />
                }
              >
                <TrendLines
                  data={yoyData}
                  xKey="month"
                  height={260}
                  series={[
                    { key: 'expense', label: 'Kỳ này', color: CHART.expense },
                    { key: 'prevYearExpense', label: 'Cùng kỳ năm trước', color: CHART.muted },
                  ]}
                />
              </ChartCard>
            </div>

            {/* Ma trận danh mục × tháng */}
            <section className="glass-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-semibold text-text">{matrixKind === 'OUT' ? 'Chi' : 'Thu'} theo danh mục và tháng</h2>
                  <p className="text-xs text-text-muted">Ô đậm hơn = số tiền lớn hơn trong bảng</p>
                </div>
                <div className="inline-flex rounded-xl bg-surface-light p-1 border border-slate-200" role="tablist">
                  {(['OUT', 'IN'] as const).map((k) => (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={matrixKind === k}
                      onClick={() => setMatrixKind(k)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${matrixKind === k ? 'bg-white shadow-sm text-text' : 'text-text-secondary'}`}
                    >
                      {k === 'OUT' ? 'Chi' : 'Thu'}
                    </button>
                  ))}
                </div>
              </div>
              <Matrix months={data.months} rows={rows} color={matrixKind === 'OUT' ? CHART.expense : CHART.income} />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ChartCard
                className="xl:col-span-2"
                title="Xu hướng một danh mục chi"
                actions={
                  <div className="w-56">
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
                table={
                  trendRow && (
                    <DataTable head={['Tháng', trendRow.name]} rows={data.months.map((m, i) => [formatMonthLabel(m), formatVND(trendRow.values[i])])} />
                  )
                }
              >
                {trendRow ? (
                  <>
                    <p className="text-xs text-text-muted mb-2">
                      Trung bình {formatVND(Math.round(trendRow.average))}/tháng · Tổng {formatVND(trendRow.total)}
                    </p>
                    <TrendLines
                      data={data.months.map((m, i) => ({ month: m, value: trendRow.values[i] }))}
                      xKey="month"
                      series={[{ key: 'value', label: trendRow.name, color: CHART.expense }]}
                    />
                  </>
                ) : (
                  <p className="text-sm text-text-muted py-8 text-center">Chưa có dữ liệu</p>
                )}
              </ChartCard>

              <ChartCard title="Tổng hợp theo tháng">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular">
                    <thead className="table-header">
                      <tr>
                        <th className="px-2 py-2 text-left">Tháng</th>
                        <th className="px-2 py-2 text-right">Chênh lệch</th>
                        <th className="px-2 py-2 text-right">Tiết kiệm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map((m) => (
                        <tr key={m.month} className="table-row">
                          <td className="px-2 py-1.5 text-text">{formatMonthLabel(m.month)}</td>
                          <td className={`px-2 py-1.5 text-right ${m.net < 0 ? 'text-danger' : 'text-text'}`}>{formatCompactVND(m.net)}</td>
                          <td className="px-2 py-1.5 text-right text-text-secondary">{pct(m.savingsRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Bảng danh mục × tháng; nền ô theo thang một màu (nhạt → đậm) cho độ lớn, chữ luôn màu mực.
function Matrix({ months, rows, color }: { months: string[]; rows: Row[]; color: string }) {
  if (!rows.length) return <p className="p-8 text-center text-sm text-text-muted">Chưa có dữ liệu trong khoảng này</p>;
  const max = Math.max(...rows.flatMap((r) => r.values), 1);
  // Tổng chỉ cộng dòng cấp cao nhất (dòng cha đã gộp con)
  const tops = rows.filter((r) => r.parentId === null);
  const colTotals = months.map((_, i) => tops.reduce((s, r) => s + r.values[i], 0));
  const grand = colTotals.reduce((s, v) => s + v, 0);
  const alpha = (v: number) => (v <= 0 ? 0 : 0.08 + 0.42 * (v / max));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular">
        <thead className="table-header">
          <tr>
            <th className="px-3 py-2 text-left sticky left-0 bg-[#F8FAFC] min-w-44">Danh mục</th>
            {months.map((m) => (
              <th key={m} className="px-2 py-2 text-right whitespace-nowrap">{formatMonthLabel(m)}</th>
            ))}
            <th className="px-3 py-2 text-right">Tổng</th>
            <th className="px-3 py-2 text-right whitespace-nowrap">TB/tháng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.categoryId)} className={`border-b border-slate-100 ${r.parentId !== null ? 'bg-slate-50/60 text-text-secondary' : ''}`}>
              <td className={`px-3 py-1.5 sticky left-0 ${r.parentId !== null ? 'bg-[#FAFBFD] pl-8' : 'bg-white'}`}>
                <span className="flex items-center gap-2">
                  {r.parentId !== null && <span className="text-text-muted" aria-hidden>└</span>}
                  <CategoryIcon icon={r.icon} color={r.color} size="sm" />
                  <span className={`truncate ${r.parentId !== null ? 'text-text-secondary' : 'text-text font-medium'}`}>{r.name}</span>
                </span>
              </td>
              {r.values.map((v, i) => (
                <td key={months[i]} className="px-2 py-1.5 text-right text-text whitespace-nowrap" title={formatVND(v)}>
                  <span
                    className="inline-block rounded px-1.5 py-0.5 min-w-14"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} ${Math.round(alpha(v) * 100)}%, transparent)` }}
                  >
                    {v ? formatCompactVND(v) : '·'}
                  </span>
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-medium text-text whitespace-nowrap">{formatCompactVND(r.total)}</td>
              <td className="px-3 py-1.5 text-right text-text-secondary whitespace-nowrap">{formatCompactVND(Math.round(r.average))}</td>
            </tr>
          ))}
          <tr className="bg-surface-light font-semibold">
            <td className="px-3 py-2 sticky left-0 bg-surface-light text-text">Tổng</td>
            {colTotals.map((v, i) => (
              <td key={months[i]} className="px-2 py-2 text-right text-text whitespace-nowrap">{formatCompactVND(v)}</td>
            ))}
            <td className="px-3 py-2 text-right text-text whitespace-nowrap">{formatCompactVND(grand)}</td>
            <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">{formatCompactVND(Math.round(grand / months.length))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
