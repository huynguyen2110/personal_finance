'use client';

import { Panel } from '@xyflow/react';
import { Focus, Link2, ListChecks, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn } from '@/modules/mindmap/lib/utils';

export type LinkMode = 'selected' | 'all' | 'none';

const LINK_MODE_LABELS: Record<LinkMode, string> = {
  selected: 'khi chọn',
  all: 'tất cả',
  none: 'ẩn',
};
const NEXT_LINK_MODE: Record<LinkMode, LinkMode> = {
  selected: 'all',
  all: 'none',
  none: 'selected',
};

export function CanvasToolbar({
  title,
  onOpenProperties,
  linkMode,
  linkCount,
  onLinkModeChange,
  areas,
  focusAreaId,
  onFocusChange,
}: {
  title: string;
  onOpenProperties: () => void;
  linkMode: LinkMode;
  linkCount: number;
  onLinkModeChange: (mode: LinkMode) => void;
  areas: { id: number; title: string }[];
  focusAreaId: number | null;
  onFocusChange: (areaId: number | null) => void;
}) {
  return (
    <>
      <Panel position="top-left">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white/90 px-3 py-2 shadow-lg shadow-gray-950/5 backdrop-blur-md">
          <span className="max-w-64 truncate text-sm font-semibold tracking-tight">
            {title}
          </span>
          <Button variant="ghost" size="sm" onClick={onOpenProperties}>
            <Settings2 size={14} /> Thuộc tính
          </Button>
          <label
            className={cn(
              'flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs',
              focusAreaId !== null
                ? 'bg-violet-50 text-violet-700'
                : 'text-gray-600',
            )}
            title="Chỉ hiện một lĩnh vực"
          >
            <Focus size={14} />
            <select
              value={focusAreaId ?? ''}
              onChange={(e) =>
                onFocusChange(
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
              className="max-w-40 cursor-pointer bg-transparent font-medium outline-none"
            >
              <option value="">Tất cả lĩnh vực</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLinkModeChange(NEXT_LINK_MODE[linkMode])}
            title="Bấm để đổi: hiện liên kết khi chọn nhánh → tất cả → ẩn"
            className={cn(linkMode === 'none' && 'text-gray-400')}
          >
            <Link2 size={14} /> Liên kết{linkCount > 0 && ` (${linkCount})`}:{' '}
            {LINK_MODE_LABELS[linkMode]}
          </Button>
          <Link
            href={growthRoutes.plan}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-violet-700"
          >
            <ListChecks size={14} /> Kế hoạch
          </Link>
        </div>
      </Panel>
      {/* Gợi ý phím tắt: ẩn khi màn hình hẹp để không che thanh công cụ */}
      <Panel position="top-right" className="hidden 2xl:block">
        <div className="rounded-xl border border-gray-200/80 bg-white/90 px-3 py-1.5 text-[11px] text-gray-500 shadow-lg shadow-gray-950/5 backdrop-blur-md">
          <b>Tab</b> thêm nhánh con · <b>Enter</b> thêm nhánh ngang ·{' '}
          <b>Click đúp</b> đổi tên · <b>Delete</b> xóa · <b>L</b> nối liên kết ·
          Kéo node thả vào node khác để đổi cha
        </div>
      </Panel>
    </>
  );
}
