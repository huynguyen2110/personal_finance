import { NodePropertyValue } from '@/modules/mindmap/mindmaps/types';
import { PropertyDefinition } from '@/modules/mindmap/properties/api';
import { formatPropertyNumber } from '@/modules/mindmap/properties/format';

export interface NodeChip {
  key: string;
  label: string;
  /** Option color for selects; null = neutral gray chip. */
  color: string | null;
}

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};

/** Compact chips shown on a canvas node for its property values. */
export function buildChips(
  values: NodePropertyValue[],
  definitions: PropertyDefinition[] | undefined,
): NodeChip[] {
  if (!definitions || values.length === 0) return [];
  const chips: NodeChip[] = [];
  for (const def of definitions) {
    const entry = values.find((v) => v.propertyDefinitionId === def.id);
    if (!entry || entry.value === null || entry.value === undefined) continue;
    const key = String(def.id);
    switch (def.type) {
      case 'select': {
        const opt = def.options?.find((o) => o.id === entry.value);
        if (opt) chips.push({ key, label: opt.label, color: opt.color });
        break;
      }
      case 'boolean':
        // Only show when true — a false flag is noise on the canvas.
        if (entry.value === true) chips.push({ key, label: def.name, color: null });
        break;
      case 'date':
        chips.push({
          key,
          label: `${def.name}: ${formatDate(String(entry.value))}`,
          color: null,
        });
        break;
      case 'number':
        chips.push({
          key,
          label: def.unit
            ? formatPropertyNumber(def.unit, Number(entry.value), true)
            : `${def.name}: ${entry.value}`,
          color: null,
        });
        break;
      default:
        chips.push({
          key,
          label: `${def.name}: ${truncate(String(entry.value), 14)}`,
          color: null,
        });
    }
  }
  return chips;
}

/** Rough pixel width of one chip, kept in sync with MindNode's chip CSS. */
export function chipWidth(chip: NodeChip): number {
  return 14 + chip.label.length * 5.6;
}
