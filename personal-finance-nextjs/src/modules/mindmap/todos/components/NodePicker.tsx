'use client';

import { ChevronDown, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNodeOptions } from '../hooks';

/** Multi-select of mindmap nodes to link a todo to. */
export function NodePicker({
  selectedIds,
  onChange,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: options } = useNodeOptions(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (options ?? []).filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (options ?? [])
      .filter((o) => !o.isRoot)
      .filter(
        (o) =>
          !q ||
          o.title.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [options, search]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-left text-sm"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">Gắn với hành động / lĩnh vực…</span>
        ) : (
          selected.map((o) => (
            <span
              key={o.id}
              className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700"
            >
              {o.title}
              <X
                size={11}
                className="cursor-pointer hover:text-violet-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selectedIds.filter((id) => id !== o.id));
                }}
              />
            </span>
          ))
        )}
        <ChevronDown size={14} className="ml-auto shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <input
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhánh…"
            className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none"
          />
          <ul className="max-h-52 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Không tìm thấy nhánh nào
              </li>
            )}
            {filtered.map((o) => {
              const isSelected = selectedIds.includes(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(
                        isSelected
                          ? selectedIds.filter((id) => id !== o.id)
                          : [...selectedIds, o.id],
                      );
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${isSelected ? 'bg-violet-50' : ''}`}
                  >
                    <span>{o.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-100 p-1.5 text-right">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
