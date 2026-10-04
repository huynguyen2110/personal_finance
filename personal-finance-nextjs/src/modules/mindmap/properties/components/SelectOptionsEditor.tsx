'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { SelectOption } from '../api';

const OPTION_COLORS = [
  '#0ca678',
  '#f59f00',
  '#e64980',
  '#3b5bdb',
  '#9c36b5',
  '#e8590c',
];

export function SelectOptionsEditor({
  options,
  onChange,
  showWeight = false,
}: {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
  /** Hiện ô "mức" (weight) khi thuộc tính có vai trò trong kế hoạch. */
  showWeight?: boolean;
}) {
  const add = () => {
    onChange([
      ...options,
      {
        id: `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        label: '',
        color: OPTION_COLORS[options.length % OPTION_COLORS.length],
      },
    ]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">
        Các lựa chọn
        {showWeight && (
          <span className="font-normal text-gray-400">
            {' '}
            · Mức: số càng lớn càng ưu tiên / càng khó (bỏ trống = theo thứ
            tự, lựa chọn sau mức cao hơn)
          </span>
        )}
      </p>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            type="color"
            value={opt.color}
            onChange={(e) => {
              const next = [...options];
              next[i] = { ...opt, color: e.target.value };
              onChange(next);
            }}
            className="h-7 w-7 cursor-pointer rounded border border-gray-200"
          />
          <input
            value={opt.label}
            placeholder="Tên lựa chọn"
            onChange={(e) => {
              const next = [...options];
              next[i] = { ...opt, label: e.target.value };
              onChange(next);
            }}
            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          {showWeight && (
            <input
              type="number"
              min={0}
              max={10}
              value={opt.weight ?? ''}
              placeholder="Mức"
              title="Mức (0–10)"
              onChange={(e) => {
                const next = [...options];
                next[i] = {
                  ...opt,
                  weight:
                    e.target.value === ''
                      ? undefined
                      : Math.min(10, Math.max(0, Number(e.target.value))),
                };
                onChange(next);
              }}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
            />
          )}
          <button
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={add}>
        <Plus size={13} /> Thêm lựa chọn
      </Button>
    </div>
  );
}
