'use client';

import { useReactFlow, useViewport } from '@xyflow/react';
import {
  ChevronDown,
  GitBranch,
  Network,
  PanelRight,
  Scan,
  Settings2,
  Share2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { NodeLink } from '@/modules/mindmap/links/api';
import { FIT_VIEW } from '../layout';
import { cn } from '@/modules/mindmap/lib/utils';

/** Cây: chỉ vẽ liên kết của nhánh đang chọn / rê chuột. Mạng lưới: vẽ mọi liên kết. */
export type LinkMode = 'selected' | 'all';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-white px-1.5 py-0.5 font-bold text-violet-700">
      {children}
    </span>
  );
}

export function MapToolbar({
  title,
  links,
  areas,
  focusAreaId,
  onFocusChange,
  linkMode,
  onLinkModeChange,
  inspectorOpen,
  onToggleInspector,
  onOpenProperties,
}: {
  title: string;
  links: NodeLink[];
  areas: { id: number; title: string }[];
  focusAreaId: number | null;
  onFocusChange: (areaId: number | null) => void;
  linkMode: LinkMode;
  onLinkModeChange: (mode: LinkMode) => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onOpenProperties: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const count = (kind: NodeLink['kind']) =>
    links.filter((l) => l.kind === kind).length;

  const iconBtn =
    'flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-gray-900';

  return (
    <div className="z-30 flex shrink-0 items-center justify-between gap-3 bg-white px-4 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
            <Network size={18} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] font-semibold leading-tight tracking-tight text-gray-900">
              {title || 'Bản đồ phát triển bản thân'}
            </span>
            <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-gray-500">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
              {links.length} liên kết: {count('prerequisite')} điều kiện trước •{' '}
              {count('supports')} bổ trợ • {count('related')} liên quan
            </span>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-gray-200 md:block" />

        <div className="relative hidden md:block">
          <select
            value={focusAreaId ?? ''}
            onChange={(e) =>
              onFocusChange(e.target.value === '' ? null : Number(e.target.value))
            }
            title="Chỉ hiện một lĩnh vực"
            className={cn(
              'cursor-pointer appearance-none rounded-xl py-1.5 pr-8 pl-3 text-xs font-semibold outline-none transition',
              focusAreaId !== null
                ? 'bg-violet-100 text-violet-800'
                : 'bg-[#f2f3ff] text-gray-800 hover:bg-[#eaedff]',
            )}
          >
            <option value="">Tất cả nhánh ({areas.length} lĩnh vực)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-500"
          />
        </div>

        <div className="hidden items-center rounded-xl bg-[#f2f3ff] p-1 lg:flex">
          {(
            [
              ['selected', GitBranch, 'Cây mục tiêu', 'Chỉ hiện liên kết của nhánh đang chọn'],
              ['all', Share2, 'Mạng lưới', 'Hiện mọi liên kết giữa các nhánh'],
            ] as const
          ).map(([mode, Icon, label, hint]) => (
            <button
              key={mode}
              type="button"
              title={hint}
              onClick={() => onLinkModeChange(mode)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap transition',
                linkMode === mode
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1 rounded-full bg-[#f2f3ff] px-3 py-1 text-[11px] font-semibold text-gray-500 2xl:flex">
          <Kbd>Tab</Kbd> nhánh con <span className="opacity-30">•</span>
          <Kbd>Enter</Kbd> nhánh ngang <span className="opacity-30">•</span>
          <Kbd>L</Kbd> nối liên kết
        </div>

        <div className="flex items-center gap-0.5 rounded-xl bg-[#f2f3ff] p-1">
          <button type="button" title="Phóng to" onClick={() => zoomIn()} className={iconBtn}>
            <ZoomIn size={17} />
          </button>
          <span className="min-w-[42px] px-1 text-center text-[11px] font-bold tabular-nums text-gray-800">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" title="Thu nhỏ" onClick={() => zoomOut()} className={iconBtn}>
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            title="Vừa màn hình"
            onClick={() => fitView(FIT_VIEW)}
            className={iconBtn}
          >
            <Scan size={16} />
          </button>
        </div>

        <button
          type="button"
          title="Quản lý thuộc tính (Ưu tiên, Độ khó, …)"
          onClick={onOpenProperties}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f2f3ff] text-gray-600 transition hover:bg-[#eaedff] hover:text-gray-900"
        >
          <Settings2 size={16} />
        </button>
        <button
          type="button"
          onClick={onToggleInspector}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition',
            inspectorOpen
              ? 'bg-violet-600 text-white hover:bg-violet-700'
              : 'bg-violet-100 text-violet-800 hover:bg-violet-200',
          )}
        >
          <PanelRight size={16} />
          <span className="hidden sm:inline">Chi tiết nhánh</span>
        </button>
      </div>
    </div>
  );
}
