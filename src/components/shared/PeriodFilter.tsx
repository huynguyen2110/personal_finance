'use client';

import { CalendarDays } from 'lucide-react';
import { PERIOD_OPTIONS, type Period, type PeriodPreset } from '@/lib/period';
import type { AccountDTO } from '@/lib/types';

interface Props {
  preset: PeriodPreset;
  period: Period;
  onPreset: (p: PeriodPreset) => void;
  onCustom: (p: Period) => void;
  accounts?: AccountDTO[];
  accountId?: number | null;
  onAccount?: (id: number | null) => void;
}

// Một hàng bộ lọc duy nhất phía trên toàn bộ biểu đồ của trang.
export default function PeriodFilter({
  preset,
  period,
  onPreset,
  onCustom,
  accounts,
  accountId,
  onAccount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <select
          aria-label="Chọn kỳ"
          value={preset}
          onChange={(e) => onPreset(e.target.value as PeriodPreset)}
          className="select-field !w-auto"
          style={{ paddingLeft: '2.25rem' }}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Từ ngày"
            className="input-field !w-auto !py-2"
            value={period.from}
            max={period.to}
            onChange={(e) => e.target.value && onCustom({ from: e.target.value, to: period.to })}
          />
          <span className="text-text-muted text-sm">→</span>
          <input
            type="date"
            aria-label="Đến ngày"
            className="input-field !w-auto !py-2"
            value={period.to}
            min={period.from}
            onChange={(e) => e.target.value && onCustom({ from: period.from, to: e.target.value })}
          />
        </div>
      )}
      {accounts && onAccount && (
        <select
          aria-label="Tài khoản"
          value={accountId ?? ''}
          onChange={(e) => onAccount(e.target.value ? Number(e.target.value) : null)}
          className="select-field !w-auto"
        >
          <option value="">Tất cả tài khoản</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
