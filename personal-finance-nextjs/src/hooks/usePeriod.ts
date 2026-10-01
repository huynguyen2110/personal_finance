'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolvePeriod, type Period, type PeriodPreset } from '@/lib/period';

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

  const period = useMemo(() => resolvePeriod(state.preset, state.custom), [state.preset, state.custom]);

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
