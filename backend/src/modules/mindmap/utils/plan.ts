// Chấm điểm + gợi ý hành động cho view Kế hoạch, và gom todo theo lĩnh vực — hàm thuần, có test riêng.
// Quy ước: nhánh cấp 1 = lĩnh vực, nhánh cấp ≥2 = hành động.
import { addDaysStr } from '../../../common/utils/dates.util';
import { depthAndArea, type TreeLink } from './tree';

export interface PlanNode extends TreeLink {
  title: string;
  status: string | null;
  orderIndex: number;
}

export interface PlanOption {
  id: string;
  label: string;
  color: string;
  weight?: number;
}

export interface PlanDefinition {
  id: number;
  role: string | null;
  options: PlanOption[] | null;
}

export interface PlanValue {
  nodeId: number;
  propertyDefinitionId: number;
  value: unknown;
}

export interface PlanLink {
  sourceNodeId: number;
  targetNodeId: number;
  kind: string;
}

export interface PlanTodo {
  date: string;
  completed: boolean;
  durationMinutes: number | null;
  effectiveness: number | null;
  nodeIds: number[];
}

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
  status: string | null;
  priority: OptionRef | null;
  // true = hành động chưa chọn ưu tiên, đang dùng ưu tiên của lĩnh vực
  priorityInherited: boolean;
  difficulty: OptionRef | null;
  hours: number | null;
  cost: number | null;
  blockedBy: NodeRef[];
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
  status: string | null;
  priority: OptionRef | null;
  actionsTotal: number;
  actionsDone: number;
  remainingHours: number;
  remainingCost: number;
  todos: TodoSummary;
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

export const PLAN_WINDOW_DAYS = 28;
const NEGLECT_DAYS = 14;
const NEXT_LIMIT = 5;
// Trọng số điểm: ưu tiên, dễ, đòn bẩy, rẻ, nhanh
const W = { priority: 0.4, ease: 0.2, leverage: 0.2, cost: 0.1, time: 0.1 };
const DOING_BONUS = 5;
const HIGH = 0.75;

// Mức của từng lựa chọn chuẩn hóa về 0–1 (weight; thiếu thì theo thứ tự, lựa chọn sau mức cao hơn)
export function optionLevels(options: PlanOption[] | null): Map<string, number> {
  const list = options ?? [];
  const raw = list.map((o, i) => (typeof o.weight === 'number' ? o.weight : i + 1));
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  return new Map(list.map((o, i) => [o.id, max > min ? (raw[i] - min) / (max - min) : 0.5]));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function summarize(todos: PlanTodo[]): TodoSummary {
  let done = 0;
  let minutes = 0;
  let effSum = 0;
  let effCount = 0;
  let lastDate: string | null = null;
  for (const t of todos) {
    if (t.completed) done++;
    minutes += t.durationMinutes ?? 0;
    if (t.effectiveness !== null) {
      effSum += t.effectiveness;
      effCount++;
    }
    if ((t.completed || (t.durationMinutes ?? 0) > 0) && (!lastDate || t.date > lastDate)) lastDate = t.date;
  }
  return { total: todos.length, done, minutes, avgEffectiveness: effCount ? round1(effSum / effCount) : null, lastDate };
}

export function buildPlan(input: {
  nodes: PlanNode[];
  definitions: PlanDefinition[];
  values: PlanValue[];
  links: PlanLink[];
  todos: PlanTodo[];
  today: string;
}): Plan {
  const { nodes, definitions, values, links, todos, today } = input;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const info = depthAndArea(nodes);
  const ref = (id: number): NodeRef => ({ nodeId: id, title: byId.get(id)?.title ?? '' });
  const isDone = (id: number) => byId.get(id)?.status === 'done';

  const defByRole = new Map(definitions.filter((d) => d.role).map((d) => [d.role!, d]));
  const levelsByDef = new Map(definitions.map((d) => [d.id, optionLevels(d.options)]));
  const valueOf = new Map(values.map((v) => [`${v.nodeId}:${v.propertyDefinitionId}`, v.value]));
  const roleValue = (nodeId: number, role: string) => {
    const def = defByRole.get(role);
    return def ? valueOf.get(`${nodeId}:${def.id}`) : undefined;
  };
  const selectRef = (nodeId: number, role: string): { option: OptionRef; level: number } | null => {
    const def = defByRole.get(role);
    const id = roleValue(nodeId, role);
    const opt = def?.options?.find((o) => o.id === id);
    if (!def || !opt) return null;
    return { option: { id: opt.id, label: opt.label, color: opt.color }, level: levelsByDef.get(def.id)?.get(opt.id) ?? 0.5 };
  };
  const numberOf = (nodeId: number, role: string) => {
    const v = roleValue(nodeId, role);
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };

  // Todo cộng dồn lên mọi tổ tiên (mỗi todo tính một lần cho mỗi node)
  const todosOf = new Map<number, Set<PlanTodo>>();
  for (const t of todos) {
    for (const nodeId of t.nodeIds) {
      let cursor: number | null | undefined = nodeId;
      const seen = new Set<number>();
      while (cursor != null && byId.has(cursor) && !seen.has(cursor)) {
        seen.add(cursor);
        const set = todosOf.get(cursor) ?? new Set<PlanTodo>();
        set.add(t);
        todosOf.set(cursor, set);
        cursor = byId.get(cursor)?.parentId;
      }
    }
  }
  const todoSummary = (id: number) => summarize([...(todosOf.get(id) ?? [])]);

  const openChildren = new Set<number>();
  for (const n of nodes) {
    if (n.parentId !== null && n.status !== 'done') openChildren.add(n.parentId);
  }

  const outgoing = (id: number, kind: string) => links.filter((l) => l.kind === kind && l.sourceNodeId === id);
  const incoming = (id: number, kind: string) => links.filter((l) => l.kind === kind && l.targetNodeId === id);

  const actionNodes = nodes
    .filter((n) => (info.get(n.id)?.depth ?? 0) >= 2)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
  const open = actionNodes.filter((n) => n.status !== 'done');
  const maxHours = Math.max(0, ...open.map((n) => numberOf(n.id, 'time') ?? 0));
  const maxCost = Math.max(0, ...open.map((n) => numberOf(n.id, 'cost') ?? 0));

  const actions: PlanAction[] = actionNodes.map((n) => {
    const areaId = info.get(n.id)!.areaId!;
    const own = selectRef(n.id, 'priority');
    const inherited = own ? null : selectRef(areaId, 'priority');
    const priority = own ?? inherited;
    const difficulty = selectRef(n.id, 'difficulty');
    const hours = numberOf(n.id, 'time');
    const cost = numberOf(n.id, 'cost');

    const blockedBy = incoming(n.id, 'prerequisite')
      .filter((l) => !isDone(l.sourceNodeId))
      .map((l) => ref(l.sourceNodeId));
    const unlocks = outgoing(n.id, 'prerequisite')
      .filter((l) => !isDone(l.targetNodeId))
      .map((l) => ref(l.targetNodeId));
    const supports = outgoing(n.id, 'supports')
      .filter((l) => !isDone(l.targetNodeId))
      .map((l) => ref(l.targetNodeId));
    const supportedBy = incoming(n.id, 'supports').map((l) => ref(l.sourceNodeId));
    const summary = todoSummary(n.id);

    const p = priority?.level ?? 0.5;
    const ease = difficulty ? 1 - difficulty.level : 0.5;
    const leverage = Math.min(1, (unlocks.length + supports.length) / 3);
    const costNorm = cost === null ? 0.5 : maxCost > 0 ? Math.min(1, cost / maxCost) : 0;
    const timeNorm = hours === null ? 0.5 : maxHours > 0 ? Math.min(1, hours / maxHours) : 0;
    const base = W.priority * p + W.ease * ease + W.leverage * leverage + W.cost * (1 - costNorm) + W.time * (1 - timeNorm);
    const score = Math.round(100 * base) + (n.status === 'doing' ? DOING_BONUS : 0);

    const reasons: string[] = [];
    if (n.status === 'doing') reasons.push('Đang làm dở');
    if (priority && priority.level >= HIGH) {
      reasons.push(inherited ? `Lĩnh vực ưu tiên ${priority.option.label.toLowerCase()}` : `Ưu tiên ${priority.option.label.toLowerCase()}`);
    }
    if (difficulty && ease >= HIGH) reasons.push(difficulty.option.label);
    if (unlocks.length) reasons.push(`Mở khóa ${unlocks.length} việc`);
    if (supports.length) reasons.push(`Bổ trợ ${supports.length} việc`);
    if (cost === 0) reasons.push('Không tốn tiền');
    if (hours !== null && hours > 0 && hours <= 2) reasons.push('Nhanh (≤ 2 giờ)');
    if (summary.minutes > 0) reasons.push(`Có đà: ${summary.minutes} phút/${PLAN_WINDOW_DAYS} ngày`);

    return {
      nodeId: n.id,
      title: n.title,
      areaId,
      areaTitle: byId.get(areaId)?.title ?? '',
      depth: info.get(n.id)!.depth,
      status: n.status,
      priority: priority?.option ?? null,
      priorityInherited: !!inherited,
      difficulty: difficulty?.option ?? null,
      hours,
      cost,
      blockedBy,
      unlocks,
      supports,
      supportedBy,
      hasOpenChildren: openChildren.has(n.id),
      todos: summary,
      score,
      reasons,
    };
  });

  const byScore = (a: PlanAction, b: PlanAction) => b.score - a.score || a.nodeId - b.nodeId;
  const pending = actions.filter((a) => a.status !== 'done');
  // Hành động có bước con chưa xong → gợi ý bước con thay vì chính nó
  const next = pending.filter((a) => !a.blockedBy.length && !a.hasOpenChildren).sort(byScore).slice(0, NEXT_LIMIT);
  const blocked = pending.filter((a) => a.blockedBy.length).sort(byScore);

  const neglectFrom = addDaysStr(today, -(NEGLECT_DAYS - 1));
  const areas: PlanArea[] = nodes
    .filter((n) => info.get(n.id)?.depth === 1)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id)
    .map((n) => {
      const mine = actions.filter((a) => a.areaId === n.id);
      const left = mine.filter((a) => a.status !== 'done');
      const priority = selectRef(n.id, 'priority');
      const summary = todoSummary(n.id);
      return {
        nodeId: n.id,
        title: n.title,
        status: n.status,
        priority: priority?.option ?? null,
        actionsTotal: mine.length,
        actionsDone: mine.length - left.length,
        remainingHours: round1(left.reduce((s, a) => s + (a.hours ?? 0), 0)),
        remainingCost: left.reduce((s, a) => s + (a.cost ?? 0), 0),
        todos: summary,
        neglected: !!priority && priority.level >= HIGH && n.status !== 'done' && (!summary.lastDate || summary.lastDate < neglectFrom),
      };
    });

  return {
    today,
    windowDays: PLAN_WINDOW_DAYS,
    roles: {
      priority: defByRole.has('priority'),
      difficulty: defByRole.has('difficulty'),
      time: defByRole.has('time'),
      cost: defByRole.has('cost'),
    },
    areas,
    actions: [...actions].sort(byScore),
    next,
    blocked,
  };
}

export interface AreaNode extends TreeLink {
  title: string;
  mindmapId: number;
  mindmapTitle: string;
}

export interface AreaWeekRow {
  areaId: number;
  title: string;
  mindmapId: number;
  mindmapTitle: string;
  total: number;
  done: number;
  minutes: number;
  prevMinutes: number;
  avgEffectiveness: number | null;
}

// Gom todo theo lĩnh vực (nhánh cấp 1) trên mọi mindmap: mỗi lĩnh vực đếm todo một lần;
// số phút của todo gắn nhiều lĩnh vực được chia đều. `prev` = tuần trước, chỉ lấy số phút để so sánh.
export function aggregateByArea(nodes: AreaNode[], current: PlanTodo[], prev: PlanTodo[]): AreaWeekRow[] {
  const info = depthAndArea(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const areasOf = (t: PlanTodo) => [...new Set(t.nodeIds.map((id) => info.get(id)?.areaId).filter((a): a is number => a != null))];

  const rows = new Map<number, AreaWeekRow & { effSum: number; effCount: number }>();
  const row = (areaId: number) => {
    let r = rows.get(areaId);
    if (!r) {
      const n = byId.get(areaId)!;
      r = { areaId, title: n.title, mindmapId: n.mindmapId, mindmapTitle: n.mindmapTitle, total: 0, done: 0, minutes: 0, prevMinutes: 0, avgEffectiveness: null, effSum: 0, effCount: 0 };
      rows.set(areaId, r);
    }
    return r;
  };

  for (const t of current) {
    const areas = areasOf(t);
    for (const a of areas) {
      const r = row(a);
      r.total++;
      if (t.completed) r.done++;
      r.minutes += (t.durationMinutes ?? 0) / areas.length;
      if (t.effectiveness !== null) {
        r.effSum += t.effectiveness;
        r.effCount++;
      }
    }
  }
  for (const t of prev) {
    const areas = areasOf(t);
    for (const a of areas) row(a).prevMinutes += (t.durationMinutes ?? 0) / areas.length;
  }

  return [...rows.values()]
    .map(({ effSum, effCount, ...r }) => ({
      ...r,
      minutes: Math.round(r.minutes),
      prevMinutes: Math.round(r.prevMinutes),
      avgEffectiveness: effCount ? round1(effSum / effCount) : null,
    }))
    .sort((a, b) => b.minutes - a.minutes || b.done - a.done || b.total - a.total);
}
