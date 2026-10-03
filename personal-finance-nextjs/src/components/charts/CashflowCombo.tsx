'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactVND, formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { CHART, Legend, TooltipBox, axisTick, type TooltipRow } from './theme';

export interface CashflowPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null; // 0..1
}

export interface MixSeries {
  key: string;
  label: string;
  color: string;
}

export type ComboView = 'flow' | 'savings' | 'mix';

interface Props {
  data: CashflowPoint[];
  view: ComboView;
  // Đường chuẩn (VD chi trung bình) vẽ nét đứt trên trục tiền
  benchmark?: { value: number; label: string } | null;
  // Cơ cấu chi phí: mỗi điểm là tỷ trọng (0..1) của từng danh mục trong tháng
  mix?: { data: Record<string, number | string>[]; series: MixSeries[] };
  height?: number;
}

const pctText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1).replace('.', ',')}%`);
const RATE_COLOR = '#047857';
const BENCH_COLOR = '#b45309';

// Nhãn dạng "pill" nền trắng, viền màu: đọc được cả khi nằm đè lên cột
function Pill({ x, y, text, color, anchor = 'middle' }: { x: number; y: number; text: string; color: string; anchor?: 'start' | 'middle' }) {
  const w = Math.round(text.length * 6.4) + 14;
  const h = 18;
  const left = anchor === 'middle' ? x - w / 2 : x;
  return (
    <g pointerEvents="none">
      <rect x={left} y={y - h / 2} width={w} height={h} rx={9} fill="#ffffff" stroke={color} strokeOpacity={0.45} strokeWidth={1} />
      <text x={left + w / 2} y={y} dy="0.35em" textAnchor="middle" fill={color} fontSize={11} fontWeight={700}>
        {text}
      </text>
    </g>
  );
}

// Thu/chi theo tháng dạng cột đôi + đường tỷ lệ tiết kiệm (trục phải, %). Có chế độ xem tích lũy ròng và cơ cấu chi phí.
export default function CashflowCombo({ data, view, benchmark, mix, height = 300 }: Props) {
  const tickMonth = (m: string) => formatMonthLabel(m);
  // Chữ trục đậm và tối hơn mặc định một bậc để dễ đọc trên nền lưới
  const tickStrong = { ...axisTick, fill: CHART.inkSecondary, fontSize: 12 };

  if (view === 'mix' && mix) {
    return (
      <div>
        <Legend items={mix.series.map((s) => ({ label: s.label, color: s.color }))} />
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={mix.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%" stackOffset="expand">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="month" tickFormatter={tickMonth} tick={axisTick} axisLine={{ stroke: CHART.axis }} tickLine={false} />
            <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={axisTick} axisLine={false} tickLine={false} width={44} domain={[0, 1]} />
            <Tooltip
              cursor={{ fill: 'rgba(11,11,11,0.04)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as Record<string, number>;
                const total = mix.series.reduce((s, x) => s + (d[x.key] ?? 0), 0);
                return (
                  <TooltipBox
                    title={formatMonthLabel(String(label))}
                    rows={mix.series
                      .filter((x) => (d[x.key] ?? 0) > 0)
                      .map((x) => ({ label: `${x.label} (${pctText(total ? d[x.key] / total : 0)})`, value: d[x.key], color: x.color }))}
                    footer={`Tổng chi: ${formatVND(total)}`}
                  />
                );
              }}
            />
            {mix.series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="mix" fill={s.color} maxBarSize={36} radius={i === mix.series.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Tỷ lệ tiết kiệm có thể âm rất sâu (thu nhỏ, chi lớn) → kẹp đường vẽ trong [-100%, 100%], tooltip/nhãn vẫn hiện giá trị thật
  const plotted = data.map((d) => ({ ...d, ratePlot: d.savingsRate === null ? null : Math.max(-1, Math.min(1, d.savingsRate)) }));

  const legend =
    view === 'flow'
      ? [
          { label: 'Thu nhập', color: CHART.income },
          { label: 'Chi tiêu', color: CHART.expense },
          { label: 'Tỷ lệ tiết kiệm (%)', color: RATE_COLOR, line: true },
          ...(benchmark ? [{ label: benchmark.label, color: BENCH_COLOR, line: true, dashed: true }] : []),
        ]
      : [
          { label: 'Tích lũy ròng (thu − chi)', color: '#0f766e' },
          { label: 'Tỷ lệ tiết kiệm (%)', color: RATE_COLOR, line: true },
        ];

  return (
    <div>
      <Legend items={legend} />
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={plotted} margin={{ top: 28, right: 8, bottom: 0, left: 0 }} barGap={3} barCategoryGap="26%">
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={tickMonth} tick={{ ...tickStrong, fontWeight: 600 }} axisLine={{ stroke: CHART.axis }} tickLine={false} />
          <YAxis yAxisId="money" tickFormatter={(v: number) => formatCompactVND(v)} tick={tickStrong} axisLine={false} tickLine={false} width={56} />
          <YAxis
            yAxisId="rate"
            orientation="right"
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ ...tickStrong, fill: RATE_COLOR }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
          />
          <Tooltip
            cursor={{ fill: 'rgba(11,11,11,0.04)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as CashflowPoint;
              const rows: TooltipRow[] =
                view === 'flow'
                  ? [
                      { label: 'Thu nhập', value: d.income, color: CHART.income },
                      { label: 'Chi tiêu', value: d.expense, color: CHART.expense },
                    ]
                  : [{ label: 'Tích lũy ròng', value: d.net, color: '#0f766e' }];
              return <TooltipBox title={formatMonthLabel(String(label))} rows={rows} footer={`Tỷ lệ tiết kiệm: ${pctText(d.savingsRate)} · Chênh lệch: ${formatVND(d.net)}`} />;
            }}
          />
          {view === 'flow' && benchmark && (
            <ReferenceLine
              yAxisId="money"
              y={benchmark.value}
              stroke={BENCH_COLOR}
              strokeOpacity={0.7}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              // Nhãn ở mép trái, nền trắng: không đè lên cột tháng gần nhất (thường cao nhất) và trục % bên phải
              label={(props: { viewBox?: { x?: number; y?: number } }) => (
                <Pill x={(props.viewBox?.x ?? 0) + 6} y={(props.viewBox?.y ?? 0) - 12} text={benchmark.label} color={BENCH_COLOR} anchor="start" />
              )}
            />
          )}
          {view === 'flow' ? (
            <>
              <Bar yAxisId="money" dataKey="income" name="Thu nhập" fill={CHART.income} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
              <Bar yAxisId="money" dataKey="expense" name="Chi tiêu" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
            </>
          ) : (
            <Bar yAxisId="money" dataKey="net" name="Tích lũy ròng" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
          )}
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="ratePlot"
            name="Tỷ lệ tiết kiệm"
            stroke={RATE_COLOR}
            strokeWidth={3}
            dot={{ r: 4, fill: CHART.surface, stroke: RATE_COLOR, strokeWidth: 2.5 }}
            activeDot={{ r: 6, stroke: CHART.surface, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
            label={(props: { x?: number | string; y?: number | string; index?: number }) => {
              // Nhãn hiện giá trị thật (không kẹp), lấy theo chỉ số điểm
              const real = props.index !== undefined ? plotted[props.index]?.savingsRate : null;
              const x = Number(props.x);
              const y = Number(props.y);
              if (real === null || real === undefined || Number.isNaN(x) || Number.isNaN(y)) return <g />;
              // Pill nền trắng phía trên điểm; tỷ lệ âm (thâm hụt) tô đỏ để phân biệt
              return <Pill x={x} y={y - 18} text={pctText(real)} color={real < 0 ? CHART.expense : RATE_COLOR} />;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
