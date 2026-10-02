'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolvePeriod, type Period, type PeriodPreset } from '@/lib/period';
import { useMonthStartDay } from '@/modules/settings/lib';

const KEY = 'pf.period';

interface Stored {
  preset: PeriodPreset;
  custom?: Period;
  accountId?: number | null;
}

// Kỳ thời gian + tài khoản đang xem, nhớ trong phiên trình duyệt (dùng chung giữa các trang).
export function usePeriod(defaultPreset: PeriodPreset = 'this_month') {
  const [state, setState] = useState<Stored>({ preset: defaultPreset });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc sessionStorage chỉ được sau khi mount
      if (raw) setState(JSON.parse(raw) as Stored);
    } catch {
      // sessionStorage không khả dụng → dùng mặc định
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // bỏ qua
    }
  }, [state, ready]);

  // "Tháng này / tháng trước…" theo tháng tài chính (ngày bắt đầu tháng trong cài đặt)
  const startDay = useMonthStartDay();
  const period = useMemo(() => resolvePeriod(state.preset, state.custom, startDay), [state.preset, state.custom, startDay]);

  return {
    ready,
    preset: state.preset,
    period,
    accountId: state.accountId ?? null,
    setPreset: (preset: PeriodPreset) =>
      setState((s) => ({ ...s, preset, custom: preset === 'custom' ? s.custom ?? period : s.custom })),
    setCustom: (custom: Period) => setState((s) => ({ ...s, preset: 'custom', custom })),
    setAccountId: (accountId: number | null) => setState((s) => ({ ...s, accountId })),
  };
}
