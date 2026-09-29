'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { CHART, Legend, TooltipBox, axisTick } from './theme';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Record<string, number | string | null>[];
  xKey: string;
  series: TrendSeries[]; // tối đa 2–3 series, cùng đơn vị (VND) → một trục
  height?: number;
}

export default function TrendLines({ data, xKey, series, height = 240 }: Props) {
  return (
    <div>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color, line: true }))} />}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey={xKey}
            tickFormatter={(m: string) => formatMonthLabel(m)}
            tick={axisTick}
            axisLine={{ stroke: CHART.axis }}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis tickFormatter={(v: number) => formatCompactVND(v)} tick={axisTick} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Record<string, number | null>;
              return (
                <TooltipBox
                  title={formatMonthLabel(String(label))}
                  rows={series.map((s) => ({ label: s.label, value: d[s.key], color: s.color }))}
                />
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, stroke: CHART.surface, strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
