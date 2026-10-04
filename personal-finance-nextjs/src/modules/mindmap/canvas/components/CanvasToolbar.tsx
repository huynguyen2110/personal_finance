'use client';

import { Panel } from '@xyflow/react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/modules/mindmap/components/ui/Button';

export function CanvasToolbar({
  title,
  onOpenProperties,
}: {
  title: string;
  onOpenProperties: () => void;
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
        </div>
      </Panel>
      <Panel position="top-right">
        <div className="rounded-xl border border-gray-200/80 bg-white/90 px-3 py-1.5 text-[11px] text-gray-500 shadow-lg shadow-gray-950/5 backdrop-blur-md">
          <b>Tab</b> thêm nhánh con · <b>Enter</b> thêm nhánh ngang ·{' '}
          <b>Click đúp</b> đổi tên · <b>Delete</b> xóa · Kéo node thả vào node
          khác để đổi cha
        </div>
      </Panel>
    </>
  );
}
