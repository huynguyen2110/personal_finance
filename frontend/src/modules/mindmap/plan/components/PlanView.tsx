'use client';

import { History, Info, KeyRound, Network, PiggyBank, SlidersHorizontal, Timer } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMindmapTree } from '@/modules/mindmap/canvas/useMindmapTree';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn } from '@/modules/mindmap/lib/utils';
import { useNodes } from '@/modules/mindmap/mindmaps/hooks';
import { PropertyRole, ROLE_LABELS } from '@/modules/mindmap/properties/api';
import { PropertyDefinitionManager } from '@/modules/mindmap/properties/components/PropertyDefinitionManager';
import { PlanAction } from '../api';
import { usePlan } from '../hooks';
import { ActionsTable } from './ActionsTable';
import { AreaCards } from './AreaCards';
import { BlockedPanel, PriorityList } from './NextActions';
import { QuickAddAction } from './QuickAddAction';
import { ScoringCard, TopPickCard } from './SidePanels';

type FilterKey = 'high' | 'doing' | 'free' | 'unlock';
const FILTERS: { key: FilterKey; label: string; icon: React.ReactNode; test: (a: PlanAction) => boolean }[] = [
  {
    key: 'high',
    label: 'Ưu tiên cao',
    icon: <span className="h-2 w-2 rounded-full bg-red-600" />,
    test: (a) => (a.priorityLevel ?? 0) >= 0.75,
  },
  {
    key: 'doing',
    label: 'Đang làm dở',
    icon: <Timer size={15} className="text-amber-700" />,
    test: (a) => a.status === 'doing',
  },
  {
    key: 'free',
    label: 'Chi phí 0đ',
    icon: <PiggyBank size={15} className="text-teal-700" />,
    test: (a) => a.cost === 0,
  },
  {
    key: 'unlock',
    label: 'Tiền đề then chốt (mở khóa)',
    icon: <KeyRound size={15} className="text-violet-700" />,
    test: (a) => a.unlocks.length > 0,
  },
];

const pillBase = 'flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold shadow-sm transition-colors';

export function PlanView({ mindmapId }: { mindmapId: number }) {
  const { data: plan, isLoading, dataUpdatedAt } = usePlan(mindmapId);
  const { data: nodes } = useNodes(mindmapId);
  const tree = useMindmapTree(nodes);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [areaId, setAreaId] = useState<number | null>(null);
  const colorOf = (id: number) => tree.colorOf.get(id) ?? '#7c3aed';

  const missingRoles = plan
    ? (Object.keys(plan.roles) as PropertyRole[]).filter((r) => !plan.roles[r])
    : [];

  // Ứng viên "nên làm": chưa xong, không bị chặn, không còn bước con chưa xong (giống backend) → lọc → xếp điểm
  const candidates = useMemo(() => {
    const active = FILTERS.filter((f) => filters.has(f.key));
    return (plan?.actions ?? [])
      .filter((a) => a.status !== 'done' && a.blockedBy.length === 0 && !a.hasOpenChildren)
      .filter((a) => areaId === null || a.areaId === areaId)
      .filter((a) => active.every((f) => f.test(a)))
      .sort((a, b) => b.score - a.score || a.nodeId - b.nodeId);
  }, [plan, filters, areaId]);

  const toggle = (key: FilterKey) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const allActive = filters.size === 0 && areaId === null;
  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="page-in flex w-full flex-col gap-6 p-6 md:p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Khối đầu trang */}
      <section className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl bg-white p-6 shadow-sm lg:flex-row lg:items-end">
        <div className="pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="z-10 flex max-w-3xl flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e2e7ff] px-2 py-0.5 text-[11px] font-semibold tracking-wider text-violet-700 uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-700" />
              Ma trận thứ tự ưu tiên
            </span>
            {updatedAt && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                <History size={14} className="text-teal-700" /> Cập nhật lúc {updatedAt}
              </span>
            )}
          </div>
          <h1 className="text-[28px] leading-9 font-bold tracking-tight text-gray-900">Kế hoạch &amp; Thứ tự ưu tiên</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Nhánh cấp 1 là lĩnh vực cần phát triển, nhánh bên dưới là hành động cụ thể có thể làm ngay. Điểm càng cao
            càng tạo đòn bẩy lớn — nên làm trước.
          </p>
        </div>
        <div className="z-10 flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={growthRoutes.map}
            className="flex items-center gap-1.5 rounded-xl bg-[#eaedff] px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-[#e2e7ff]"
          >
            <Network size={17} /> Mở sơ đồ cây
          </Link>
          <button
            type="button"
            onClick={() => setPropertiesOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#eaedff] px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-[#e2e7ff]"
          >
            <SlidersHorizontal size={17} /> Thuộc tính
          </button>
        </div>
      </section>

      {isLoading || !plan ? (
        <Spinner />
      ) : (
        <>
          {missingRoles.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                Chưa có thuộc tính cho: <b>{missingRoles.map((r) => ROLE_LABELS[r]).join(', ')}</b>. Phần đó được
                tính trung bình khi chấm điểm. Mở{' '}
                <button onClick={() => setPropertiesOpen(true)} className="font-medium underline">
                  Thuộc tính
                </button>{' '}
                để thêm hoặc gán vai trò.
              </span>
            </p>
          )}

          {/* Bộ lọc */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFilters(new Set());
                  setAreaId(null);
                }}
                className={cn(
                  pillBase,
                  allActive ? 'bg-violet-700 text-white' : 'bg-white text-gray-500 hover:bg-[#eaedff] hover:text-gray-900',
                )}
              >
                Tất cả lĩnh vực ({plan.areas.length})
              </button>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggle(f.key)}
                  className={cn(
                    pillBase,
                    filters.has(f.key)
                      ? 'bg-violet-100 text-violet-800 ring-1 ring-violet-300'
                      : 'bg-white text-gray-500 hover:bg-[#eaedff] hover:text-gray-900',
                  )}
                >
                  {f.icon} {f.label}
                </button>
              ))}
              {areaId !== null && (
                <button
                  type="button"
                  onClick={() => setAreaId(null)}
                  className={cn(pillBase, 'bg-violet-100 text-violet-800 ring-1 ring-violet-300')}
                  title="Bỏ lọc lĩnh vực"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(areaId) }} />
                  {plan.areas.find((a) => a.nodeId === areaId)?.title} ✕
                </button>
              )}
            </div>
            <span className="hidden shrink-0 text-[11px] font-semibold text-gray-500 sm:block">
              {candidates.length} hành động có thể làm ngay
            </span>
          </div>

          <AreaCards
            areas={plan.areas}
            windowDays={plan.windowDays}
            colorOf={colorOf}
            selectedId={areaId}
            onSelect={setAreaId}
          />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-4 lg:col-span-8">
              <PriorityList mindmapId={mindmapId} actions={candidates} colorOf={colorOf} />
              <QuickAddAction mindmapId={mindmapId} areas={plan.areas} defaultAreaId={areaId} colorOf={colorOf} />
            </div>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <BlockedPanel actions={plan.blocked} />
              <ScoringCard />
              <TopPickCard actions={plan.next} />
            </div>
          </div>

          <ActionsTable
            mindmapId={mindmapId}
            actions={plan.actions}
            areas={plan.areas}
            windowDays={plan.windowDays}
          />
        </>
      )}

      <PropertyDefinitionManager mindmapId={mindmapId} open={propertiesOpen} onClose={() => setPropertiesOpen(false)} />
    </div>
  );
}
