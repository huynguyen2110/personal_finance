'use client';

import { PropertyDefinition } from '../api';
import { formatPropertyNumber } from '../format';

export function PropertyValueInput({
  definition,
  value,
  onChange,
}: {
  definition: PropertyDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const base =
    'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-violet-500';

  switch (definition.type) {
    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-2 py-1.5">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-violet-600"
          />
          <span className="text-sm text-gray-600">
            {value === true ? 'Có' : 'Không'}
          </span>
        </label>
      );
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={definition.unit ? 0 : undefined}
            step={definition.unit === 'money' ? 1000 : 'any'}
            className={base}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
          />
          {definition.unit && typeof value === 'number' && (
            <span className="shrink-0 text-xs text-gray-400 tabular-nums">
              {formatPropertyNumber(definition.unit, value)}
            </span>
          )}
        </div>
      );
    case 'date':
      return (
        <input
          type="date"
          className={base}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case 'select': {
      const selected = definition.options?.find((o) => o.id === value);
      return (
        <div className="flex items-center gap-2">
          <select
            className={base}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || null)}
            style={
              selected
                ? { borderColor: selected.color, color: selected.color }
                : undefined
            }
          >
            <option value="">— Chưa chọn —</option>
            {(definition.options ?? []).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    default:
      return (
        <input
          type="text"
          className={base}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}
