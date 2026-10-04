import { api } from '@/modules/mindmap/lib/api';

export interface DayStat {
  date: string;
  total: number;
  done: number;
}

export interface AreaStat {
  areaId: number;
  title: string;
  mindmapId: number;
  mindmapTitle: string;
  total: number;
  done: number;
  /** Phút tuần này (todo gắn nhiều lĩnh vực được chia đều). */
  minutes: number;
  prevMinutes: number;
  avgEffectiveness: number | null;
}

export interface WeeklyStats {
  start: string;
  end: string;
  days: DayStat[];
  totals: { total: number; done: number; minutes: number };
  byArea: AreaStat[];
}

export const statsApi = {
  weekly: (start: string) =>
    api.get<WeeklyStats>('/todos/stats/weekly', { params: { start } }),
};
