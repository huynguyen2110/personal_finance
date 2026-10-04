'use client';

import { ArrowLeft, Info, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { useMindmap } from '@/modules/mindmap/mindmaps/hooks';
import { PropertyRole, ROLE_LABELS } from '@/modules/mindmap/properties/api';
import { PropertyDefinitionManager } from '@/modules/mindmap/properties/components/PropertyDefinitionManager';
import { usePlan } from '../hooks';
import { ActionsTable } from './ActionsTable';
import { AreaCards } from './AreaCards';
import { BlockedList, NextActions } from './NextActions';

export function PlanView({ mindmapId }: { mindmapId: number }) {
  const { data: mindmap } = useMindmap(mindmapId);
  const { data: plan, isLoading } = usePlan(mindmapId);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const missingRoles = plan
    ? (Object.keys(plan.roles) as PropertyRole[]).filter((r) => !plan.roles[r])
    : [];

  return (
    <div className="page-in mx-auto max-w-5xl space-y-5 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/mindmap/${mindmapId}`}
            className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-violet-700"
          >
            <ArrowLeft size={12} /> Về sơ đồ
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Kế hoạch{mindmap ? `: ${mindmap.title}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Nhánh cấp 1 là lĩnh vực, nhánh bên dưới là hành động. Điểm càng cao
            càng nên làm trước.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPropertiesOpen(true)}>
          <Settings2 size={14} /> Thuộc tính
        </Button>
      </div>

      {isLoading || !plan ? (
        <Spinner />
      ) : (
        <>
          {missingRoles.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                Chưa có thuộc tính cho:{' '}
                <b>{missingRoles.map((r) => ROLE_LABELS[r]).join(', ')}</b>.
                Phần đó được tính trung bình khi chấm điểm. Mở{' '}
                <button
                  onClick={() => setPropertiesOpen(true)}
                  className="font-medium underline"
                >
                  Thuộc tính
                </button>{' '}
                để thêm hoặc gán vai trò.
              </span>
            </p>
          )}

          <AreaCards
            mindmapId={mindmapId}
            areas={plan.areas}
            windowDays={plan.windowDays}
          />

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <NextActions mindmapId={mindmapId} actions={plan.next} />
            <div className="space-y-5">
              <BlockedList mindmapId={mindmapId} actions={plan.blocked} />
              <details className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-600 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                  Cách tính điểm
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>40% ưu tiên (trống thì lấy của lĩnh vực)</li>
                  <li>20% độ dễ</li>
                  <li>
                    20% đòn bẩy: số việc nó mở khóa (điều kiện trước) + bổ
                    trợ, tối đa 3
                  </li>
                  <li>10% rẻ, 10% nhanh (so với việc tốn nhất trong mindmap)</li>
                  <li>+5 nếu đang làm</li>
                  <li>
                    Thiếu giá trị → tính trung bình. Việc bị chặn, đã xong hoặc
                    còn bước con chưa xong không được gợi ý.
                  </li>
                </ul>
              </details>
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

      <PropertyDefinitionManager
        mindmapId={mindmapId}
        open={propertiesOpen}
        onClose={() => setPropertiesOpen(false)}
      />
    </div>
  );
}
