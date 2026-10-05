'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { addDays, formatShortDateVi, startOfWeek, toDateKey } from '@/modules/mindmap/lib/utils';

export function WeekNav({
  weekStart,
  onChange,
}: {
  weekStart: string;
  onChange: (weekStart: string) => void;
}) {
  const thisWeek = startOfWeek(toDateKey(new Date()));
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(weekStart, -7))}
        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm hover:bg-gray-50"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="min-w-48 text-center">
        <p className="text-sm font-semibold">
          {formatShortDateVi(weekStart)} – {formatShortDateVi(weekEnd)}
          {weekStart === thisWeek && (
            <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">
              Tuần này
            </span>
          )}
        </p>
      </div>
      <button
        onClick={() => onChange(addDays(weekStart, 7))}
        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm hover:bg-gray-50"
      >
        <ChevronRight size={16} />
      </button>
      {weekStart !== thisWeek && (
        <Button variant="secondary" size="sm" onClick={() => onChange(thisWeek)}>
          Tuần này
        </Button>
      )}
    </div>
  );
}
