'use client';

import { Panel } from '@xyflow/react';
import { ArrowLeft, Link2, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { cn } from '@/modules/mindmap/lib/utils';

export function CanvasToolbar({
  title,
  onOpenProperties,
  showLinks,
  linkCount,
  onToggleLinks,
}: {
  title: string;
  onOpenProperties: () => void;
  showLinks: boolean;
  linkCount: number;
  onToggleLinks: () => void;
}) {
  return (
    <>
      <Panel position="top-left">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white/90 px-3 py-2 shadow-lg shadow-gray-950/5 backdrop-blur-md">
          <Link
            href="/mindmap"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Về danh sách"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="max-w-64 truncate text-sm font-semibold tracking-tight">
            {title}
          </span>
          <Button variant="ghost" size="sm" onClick={onOpenProperties}>
            <Settings2 size={14} /> Thuộc tính
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLinks}
            title={showLinks ? 'Ẩn liên kết' : 'Hiện liên kết'}
            className={cn(!showLinks && 'text-gray-400 line-through')}
          >
            <Link2 size={14} /> Liên kết{linkCount > 0 && ` (${linkCount})`}
          </Button>
        </div>
      </Panel>
      <Panel position="top-right">
        <div className="rounded-xl border border-gray-200/80 bg-white/90 px-3 py-1.5 text-[11px] text-gray-500 shadow-lg shadow-gray-950/5 backdrop-blur-md">
          <b>Tab</b> thêm nhánh con · <b>Enter</b> thêm nhánh ngang ·{' '}
          <b>Click đúp</b> đổi tên · <b>Delete</b> xóa · <b>L</b> nối liên kết ·
          Kéo node thả vào node khác để đổi cha
        </div>
      </Panel>
    </>
  );
}
