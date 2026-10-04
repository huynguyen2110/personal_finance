import { api } from '@/modules/mindmap/lib/api';

export interface DayStat {
  date: string;
  total: number;
  done: number;
}

export interface BranchStat {
  nodeId: number;
  title: string;
  mindmapId: number;
  mindmapTitle: string;
  total: number;
  done: number;
}

export interface WeeklyStats {
  start: string;
  end: string;
  days: DayStat[];
  totals: { total: number; done: number };
  byNode: BranchStat[];
}

export const statsApi = {
  weekly: (start: string) =>
    api.get<WeeklyStats>('/todos/stats/weekly', { params: { start } }),
};
