'use client';

import { useMemo } from 'react';
import { useMindmapTree } from '@/modules/mindmap/canvas/useMindmapTree';
import { useNodes } from '@/modules/mindmap/mindmaps/hooks';
import { PlanAction } from '@/modules/mindmap/plan/api';
import { usePlan } from '@/modules/mindmap/plan/hooks';
import { Todo } from './api';

/** Nhánh gắn với todo, kèm thông tin từ trang Kế hoạch (điểm, mở khóa, độ khó…) và màu lĩnh vực. */
export interface NodeInfo {
  nodeId: number;
  title: string;
  areaId: number;
  areaTitle: string;
  color: string;
  /** null = todo gắn thẳng vào lĩnh vực (nhánh cấp 1). */
  action: PlanAction | null;
  isNext: boolean;
}

export function useGrowthLookup(mindmapId: number) {
  const { data: plan } = usePlan(mindmapId);
  const { data: nodes } = useNodes(mindmapId);
  const tree = useMindmapTree(nodes);

  return useMemo(() => {
    const info = new Map<number, NodeInfo>();
    const colorOf = (id: number) => tree.colorOf.get(id) ?? '#7c3aed';
    const nextIds = new Set((plan?.next ?? []).map((a) => a.nodeId));
    for (const area of plan?.areas ?? []) {
      info.set(area.nodeId, {
        nodeId: area.nodeId,
        title: area.title,
        areaId: area.nodeId,
        areaTitle: area.title,
        color: colorOf(area.nodeId),
        action: null,
        isNext: false,
      });
    }
    for (const a of plan?.actions ?? []) {
      info.set(a.nodeId, {
        nodeId: a.nodeId,
        title: a.title,
        areaId: a.areaId,
        areaTitle: a.areaTitle,
        color: colorOf(a.nodeId),
        action: a,
        isNext: nextIds.has(a.nodeId),
      });
    }

    /** Các nhánh (thuộc bản đồ) của một todo. */
    const nodesOf = (todo: Todo) =>
      todo.nodes.flatMap((n) => {
        const i = info.get(n.id);
        return i ? [i] : [];
      });
    /** Điểm của todo = điểm cao nhất trong các hành động gắn với nó (dùng để xếp "đòn bẩy cao nhất"). */
    const scoreOf = (todo: Todo) =>
      Math.max(-1, ...nodesOf(todo).map((i) => i.action?.score ?? -1));

    return { plan, info, nodesOf, scoreOf };
  }, [plan, tree]);
}

export type GrowthLookup = ReturnType<typeof useGrowthLookup>;

export interface AreaBreakdown {
  areaId: number;
  title: string;
  color: string;
  total: number;
  done: number;
  minutes: number;
}

/** Gom todo theo lĩnh vực (mỗi lĩnh vực đếm todo một lần; số phút tính đủ cho từng lĩnh vực). */
export function areaBreakdown(todos: Todo[], lookup: GrowthLookup): AreaBreakdown[] {
  const rows = new Map<number, AreaBreakdown>();
  for (const t of todos) {
    const areas = new Map(lookup.nodesOf(t).map((n) => [n.areaId, n]));
    for (const n of areas.values()) {
      const row = rows.get(n.areaId) ?? {
        areaId: n.areaId,
        title: n.areaTitle,
        color: lookup.info.get(n.areaId)?.color ?? n.color,
        total: 0,
        done: 0,
        minutes: 0,
      };
      row.total++;
      if (t.completed) row.done++;
      row.minutes += t.durationMinutes ?? 0;
      rows.set(n.areaId, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.minutes - a.minutes || b.total - a.total);
}
