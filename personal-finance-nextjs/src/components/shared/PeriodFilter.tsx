'use client';

import { CalendarDays } from 'lucide-react';
import DatePicker from '@/components/shared/DatePicker';
import TreeSelect from '@/components/shared/TreeSelect';
import AccountSelect from '@/components/shared/AccountSelect';
import { PERIOD_OPTIONS, type Period, type PeriodPreset } from '@/lib/period';
import type { AccountDTO } from '@/modules/accounts/types';

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
      <TreeSelect<PeriodPreset>
        ariaLabel="Chọn kỳ"
        options={PERIOD_OPTIONS}
        value={preset}
        onChange={(v) => v && onPreset(v)}
        triggerIcon={<CalendarDays className="w-4 h-4 text-text-muted" aria-hidden />}
        className="!w-auto min-w-[11rem]"
      />
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <DatePicker ariaLabel="Từ ngày" value={period.from} max={period.to} onChange={(v) => v && onCustom({ from: v, to: period.to })} />
          <span className="text-text-muted text-sm">→</span>
          <DatePicker ariaLabel="Đến ngày" value={period.to} min={period.from} onChange={(v) => v && onCustom({ from: period.from, to: v })} />
        </div>
      )}
      {accounts && onAccount && (
        <AccountSelect accounts={accounts} value={accountId ?? null} onChange={onAccount} allLabel="Tất cả tài khoản" className="!w-auto min-w-[12rem]" />
      )}
    </div>
  );
}
