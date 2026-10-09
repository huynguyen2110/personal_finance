import { api } from '@/modules/mindmap/lib/api';

export interface DayStat {
  date: string;
  total: number;
  done: number;
  /** Tổng phút ghi nhận trong ngày (mọi todo). */
  minutes: number;
}

export interface AreaStat {
  areaId: number;
  title: string;
  mindmapId: number;
  mindmapTitle: string;
  total: number;
  done: number;
  /** Phút trong kỳ (todo gắn nhiều lĩnh vực được chia đều). */
  minutes: number;
  /** Phút kỳ trước cùng độ dài. */
  prevMinutes: number;
  avgEffectiveness: number | null;
}

/** Việc gắn ≥ 2 lĩnh vực trong kỳ (một việc, nhiều tác động). */
export interface SynergyStat {
  title: string;
  nodeIds: number[];
  count: number;
  done: number;
  minutes: number;
  avgEffectiveness: number | null;
  areas: { areaId: number; title: string; minutes: number }[];
}

export interface Totals {
  total: number;
  done: number;
  minutes: number;
}

export interface RangeStats {
  from: string;
  to: string;
  days: DayStat[];
  totals: Totals;
  /** Kỳ liền trước, cùng số ngày. */
  prevTotals: Totals;
  byArea: AreaStat[];
  synergy: SynergyStat[];
}

export const statsApi = {
  range: (from: string, to: string) =>
    api.get<RangeStats>('/todos/stats/range', { params: { from, to } }),
};
