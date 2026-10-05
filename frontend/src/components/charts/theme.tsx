'use client';

import { formatVND } from '@/lib/money';

// Bảng màu dataviz theo bản thiết kế: thu = primary (teal), chi = tertiary (đỏ); kỳ so sánh dùng màu muted.
export const CHART = {
  income: '#0f766e',
  expense: '#cc1e44',
  muted: '#bdc9c6',
  mutedInk: '#6e7977',
  grid: '#e2e7ff',
  axis: '#bdc9c6',
  ink: '#131b2e',
  inkSecondary: '#3e4947',
  surface: '#ffffff',
};

export const axisTick = { fill: CHART.mutedInk, fontSize: 11 };

export interface TooltipRow {
  label: string;
  value: number | null | undefined;
  color: string;
  dashed?: boolean;
}

// Nội dung tooltip chung: tiêu đề + các dòng (chấm màu nhận diện, chữ màu mực)
export function TooltipBox({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs min-w-40">
      <p className="font-semibold text-text mb-1">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={
                r.dashed
                  ? { border: `1.5px dashed ${r.color}` }
                  : { backgroundColor: r.color }
              }
            />
            {r.label}
          </span>
          <span className="font-medium text-text tabular">{r.value === null || r.value === undefined ? '—' : formatVND(r.value)}</span>
        </div>
      ))}
      {footer && <p className="mt-1 pt-1 border-t border-slate-100 text-text-muted">{footer}</p>}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary mb-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.line ? (
            <span
              className="inline-block w-4"
              style={{ borderTop: `2px ${i.dashed ? 'dashed' : 'solid'} ${i.color}` }}
            />
          ) : (
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}
