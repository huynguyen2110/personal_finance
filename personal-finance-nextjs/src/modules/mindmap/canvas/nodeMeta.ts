import { NodeLink } from '@/modules/mindmap/links/api';
import { NodePropertyValue, TreeNode } from '@/modules/mindmap/mindmaps/types';
import { PropertyDefinition } from '@/modules/mindmap/properties/api';
import { buildChips, NodeChip } from './chips';

export interface OptionBadge {
  label: string;
  color: string;
}

/** Thông tin hiển thị trên thẻ node: thuộc tính có vai trò (ưu tiên, độ khó, giờ, chi phí) + chip của thuộc tính khác. */
export interface NodeRoleMeta {
  priority: OptionBadge | null;
  difficulty: OptionBadge | null;
  hours: number | null;
  cost: number | null;
  extraChips: NodeChip[];
}

const EMPTY: NodeRoleMeta = {
  priority: null,
  difficulty: null,
  hours: null,
  cost: null,
  extraChips: [],
};

export function roleMeta(
  values: NodePropertyValue[],
  definitions: PropertyDefinition[] | undefined,
): NodeRoleMeta {
  if (!definitions?.length) return EMPTY;
  const valueOf = (def: PropertyDefinition | undefined) =>
    def ? values.find((v) => v.propertyDefinitionId === def.id)?.value : undefined;
  const select = (role: string): OptionBadge | null => {
    const def = definitions.find((d) => d.role === role);
    const opt = def?.options?.find((o) => o.id === valueOf(def));
    return opt ? { label: opt.label, color: opt.color } : null;
  };
  const number = (role: string): number | null => {
    const v = valueOf(definitions.find((d) => d.role === role));
    return typeof v === 'number' ? v : null;
  };
  return {
    priority: select('priority'),
    difficulty: select('difficulty'),
    hours: number('time'),
    cost: number('cost'),
    extraChips: buildChips(
      values,
      definitions.filter((d) => !d.role),
    ),
  };
}

/** Điều kiện trước chưa xong (chặn node) và số việc node này mở khóa. */
export function dependencyMeta(
  nodeId: number,
  links: NodeLink[] | undefined,
  byId: Map<number, TreeNode>,
) {
  const blockedBy: string[] = [];
  let unlocks = 0;
  for (const l of links ?? []) {
    if (l.kind !== 'prerequisite') continue;
    if (l.targetNodeId === nodeId && byId.get(l.sourceNodeId)?.status !== 'done') {
      blockedBy.push(byId.get(l.sourceNodeId)?.title ?? '');
    }
    if (l.sourceNodeId === nodeId && byId.get(l.targetNodeId)?.status !== 'done') {
      unlocks++;
    }
  }
  return { blockedBy, unlocks };
}
