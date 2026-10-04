'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { addDays, formatDateVi, toDateKey } from '@/modules/mindmap/lib/utils';

export function DateNav({
  dateKey,
  onChange,
}: {
  dateKey: string;
  onChange: (dateKey: string) => void;
}) {
  const today = toDateKey(new Date());
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(dateKey, -1))}
        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="min-w-44 text-center">
        <p className="text-sm font-semibold">
          {formatDateVi(dateKey)}
          {dateKey === today && (
            <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">
              Hôm nay
            </span>
          )}
        </p>
      </div>
      <button
        onClick={() => onChange(addDays(dateKey, 1))}
        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
      >
        <ChevronRight size={16} />
      </button>
      {dateKey !== today && (
        <Button variant="secondary" size="sm" onClick={() => onChange(today)}>
          Hôm nay
        </Button>
      )}
    </div>
  );
}
