import { api } from '@/modules/mindmap/lib/api';
import { NodeStatus } from '@/modules/mindmap/mindmaps/types';

export interface OptionRef {
  id: string;
  label: string;
  color: string;
}

export interface NodeRef {
  nodeId: number;
  title: string;
}

export interface TodoSummary {
  total: number;
  done: number;
  minutes: number;
  avgEffectiveness: number | null;
  lastDate: string | null;
}

export interface PlanAction {
  nodeId: number;
  title: string;
  areaId: number;
  areaTitle: string;
  depth: number;
  status: NodeStatus | null;
  priority: OptionRef | null;
  /** Hành động chưa chọn ưu tiên → dùng ưu tiên của lĩnh vực. */
  priorityInherited: boolean;
  /** Mức ưu tiên 0–1 (1 = cao nhất); null = chưa có ưu tiên. */
  priorityLevel: number | null;
  difficulty: OptionRef | null;
  hours: number | null;
  cost: number | null;
  blockedBy: NodeRef[];
  /** Tổng số điều kiện trước (kể cả đã xong). */
  prerequisiteTotal: number;
  unlocks: NodeRef[];
  supports: NodeRef[];
  supportedBy: NodeRef[];
  hasOpenChildren: boolean;
  todos: TodoSummary;
  score: number;
  reasons: string[];
}

export interface PlanArea {
  nodeId: number;
  title: string;
  status: NodeStatus | null;
  priority: OptionRef | null;
  /** Mức ưu tiên 0–1 của lĩnh vực; null = chưa đặt. */
  priorityLevel: number | null;
  actionsTotal: number;
  actionsDone: number;
  remainingHours: number;
  remainingCost: number;
  todos: TodoSummary;
  /** Ưu tiên cao nhưng 14 ngày không có todo xong / phút nào. */
  neglected: boolean;
}

export interface Plan {
  today: string;
  windowDays: number;
  roles: { priority: boolean; difficulty: boolean; time: boolean; cost: boolean };
  areas: PlanArea[];
  actions: PlanAction[];
  next: PlanAction[];
  blocked: PlanAction[];
}

export const planApi = {
  get: (mindmapId: number) => api.get<Plan>(`/mindmaps/${mindmapId}/plan`),
};
