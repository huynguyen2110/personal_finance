'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactVND, formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { CHART, Legend, TooltipBox, axisTick } from './theme';
import { DataTable } from './ChartCard';

export interface MonthlyDatum {
  month: string;
  income: number;
  expense: number;
}

// Thu / chi theo tháng: cột đôi, một trục.
export default function MonthlyBars({ data, height = 260 }: { data: MonthlyDatum[]; height?: number }) {
  return (
    <div>
      <Legend
        items={[
          { label: 'Thu', color: CHART.income },
          { label: 'Chi', color: CHART.expense },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonthLabel(m).replace(/\/\d{2}(\d{2})$/, '/$1')}
            tick={axisTick}
            axisLine={{ stroke: CHART.axis }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactVND(v)}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ fill: 'rgba(11,11,11,0.04)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as MonthlyDatum;
              return (
                <TooltipBox
                  title={formatMonthLabel(String(label))}
                  rows={[
                    { label: 'Thu', value: d.income, color: CHART.income },
                    { label: 'Chi', value: d.expense, color: CHART.expense },
                  ]}
                  footer={`Chênh lệch: ${formatVND(d.income - d.expense)}`}
                />
              );
            }}
          />
          <Bar dataKey="income" name="Thu" fill={CHART.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" name="Chi" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyTable({ data }: { data: MonthlyDatum[] }) {
  return (
    <DataTable
      head={['Tháng', 'Thu', 'Chi', 'Chênh lệch']}
      rows={data.map((d) => [
        formatMonthLabel(d.month),
        formatVND(d.income),
        formatVND(d.expense),
        formatVND(d.income - d.expense),
      ])}
    />
  );
}
