'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactVND, formatVND } from '@/lib/money';
import { formatVNDate } from '@/lib/dates';
import { CHART, Legend, TooltipBox, axisTick, type TooltipRow } from './theme';
import { DataTable } from './ChartCard';

export interface CumulativeDatum {
  date: string;
  expense: number;
  cumulativeExpense: number;
  prevCumulativeExpense: number | null;
}

interface Props {
  data: CumulativeDatum[];
  budget?: number | null;
  height?: number;
}

// Chi lũy kế trong kỳ so với kỳ trước (và hạn mức ngân sách nếu kỳ là một tháng).
export default function CumulativeChart({ data, budget, height = 260 }: Props) {
  const legend = [
    { label: 'Kỳ này', color: CHART.expense, line: true },
    { label: 'Kỳ trước', color: CHART.muted, line: true },
    ...(budget ? [{ label: 'Ngân sách', color: CHART.inkSecondary, line: true, dashed: true }] : []),
  ];
  const short = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <div>
      <Legend items={legend} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={short}
            tick={axisTick}
            axisLine={{ stroke: CHART.axis }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactVND(v)}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={[0, (max: number) => Math.max(max, budget ?? 0) * 1.05]}
          />
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as CumulativeDatum;
              const rows: TooltipRow[] = [
                { label: 'Lũy kế kỳ này', value: d.cumulativeExpense, color: CHART.expense },
                { label: 'Lũy kế kỳ trước', value: d.prevCumulativeExpense, color: CHART.muted },
              ];
              if (budget) rows.push({ label: 'Ngân sách', value: budget, color: CHART.inkSecondary, dashed: true });
              return <TooltipBox title={formatVNDate(d.date)} rows={rows} footer={`Chi trong ngày: ${formatVND(d.expense)}`} />;
            }}
          />
          {budget ? (
            <ReferenceLine
              y={budget}
              stroke={CHART.inkSecondary}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="prevCumulativeExpense"
            stroke={CHART.muted}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeExpense"
            stroke={CHART.expense}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeTable({ data }: { data: CumulativeDatum[] }) {
  return (
    <DataTable
      head={['Ngày', 'Chi trong ngày', 'Lũy kế', 'Lũy kế kỳ trước']}
      rows={data.map((d) => [
        formatVNDate(d.date),
        formatVND(d.expense),
        formatVND(d.cumulativeExpense),
        formatVND(d.prevCumulativeExpense),
      ])}
    />
  );
}
