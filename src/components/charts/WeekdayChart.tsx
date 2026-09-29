'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactVND, formatVND } from '@/lib/money';
import { CHART, TooltipBox, axisTick } from './theme';
import { DataTable } from './ChartCard';

export const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export interface WeekdayDatum {
  weekday: number;
  average: number; // chi trung bình mỗi ngày thứ đó
  total: number;
  days: number; // số ngày thứ đó trong kỳ
}

// Chi trung bình theo thứ trong tuần (bắt đầu từ Thứ 2)
export default function WeekdayChart({ data, height = 220 }: { data: WeekdayDatum[]; height?: number }) {
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((w) => data.find((d) => d.weekday === w)!).filter(Boolean);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={ordered} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="weekday"
          tickFormatter={(w: number) => WEEKDAY_LABELS[w]}
          tick={axisTick}
          axisLine={{ stroke: CHART.axis }}
          tickLine={false}
        />
        <YAxis tickFormatter={(v: number) => formatCompactVND(v)} tick={axisTick} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as WeekdayDatum;
            return (
              <TooltipBox
                title={WEEKDAY_FULL[d.weekday]}
                rows={[{ label: 'Chi trung bình / ngày', value: Math.round(d.average), color: CHART.expense }]}
                footer={`Tổng ${formatVND(d.total)} trong ${d.days} ngày`}
              />
            );
          }}
        />
        <Bar dataKey="average" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WeekdayTable({ data }: { data: WeekdayDatum[] }) {
  return (
    <DataTable
      head={['Thứ', 'TB / ngày', 'Tổng', 'Số ngày']}
      rows={[1, 2, 3, 4, 5, 6, 0]
        .map((w) => data.find((d) => d.weekday === w))
        .filter((d): d is WeekdayDatum => !!d)
        .map((d) => [WEEKDAY_FULL[d.weekday], formatVND(Math.round(d.average)), formatVND(d.total), d.days])}
    />
  );
}
