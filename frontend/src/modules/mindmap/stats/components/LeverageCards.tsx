'use client';

import { CircleArrowRight, Check, LockOpen, Network, Sparkles, Star, Timer } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { areaIcon } from '@/modules/mindmap/lib/areaIcon';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { formatMinutes, toDateKey } from '@/modules/mindmap/lib/utils';
import { PlanAction } from '@/modules/mindmap/plan/api';
import { useCreateTodo } from '@/modules/mindmap/todos/hooks';
import { SynergyStat } from '../api';

const card = 'relative flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md';

function SynergyCard({ s, colorOf }: { s: SynergyStat; colorOf: (areaId: number) => string }) {
  const createTodo = useCreateTodo();
  const [added, setAdded] = useState(false);
  return (
    <div className={card}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
            <Sparkles size={14} /> Cộng hưởng {s.areas.length} lĩnh vực
          </span>
          <span className="text-2xl font-bold tracking-tight text-teal-700">+{formatMinutes(s.minutes)}</span>
        </div>
        <h3 className="mt-1 font-semibold text-gray-900">{s.title}</h3>
        <p className="text-[13px] text-gray-500">
          Một việc tạo tác động cho nhiều lĩnh vực cùng lúc — làm {s.count} lần trong kỳ, xong {s.done} lần.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {s.areas.map((a) => {
            const Icon = areaIcon(a.title);
            const color = colorOf(a.areaId);
            return (
              <div key={a.areaId} className="flex flex-col rounded-xl bg-[#f2f3ff] p-2">
                <span className="text-[11px] font-semibold text-gray-500">Đóng góp {a.title}</span>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color }}>
                  <Icon size={16} /> +{formatMinutes(a.minutes)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between pt-2 text-[13px] text-gray-500">
        <span className="flex items-center gap-1">
          <Star size={16} className="text-amber-600" />
          {s.avgEffectiveness !== null ? `Hiệu quả: ${s.avgEffectiveness}/5` : 'Chưa chấm hiệu quả'}
        </span>
        <button
          type="button"
          disabled={createTodo.isPending || added}
          onClick={() =>
            createTodo.mutate(
              { title: s.title, date: toDateKey(new Date()), nodeIds: s.nodeIds },
              { onSuccess: () => setAdded(true) },
            )
          }
          className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline disabled:no-underline"
        >
          {added ? (
            <>
              <Check size={14} /> Đã thêm hôm nay
            </>
          ) : (
            'Lặp lại hôm nay'
          )}
        </button>
      </div>
    </div>
  );
}

function UnlockCard({ a }: { a: PlanAction }) {
  return (
    <div className={card}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
            <LockOpen size={14} /> Mở khóa {a.unlocks.length} việc kế tiếp
          </span>
          <span className="text-2xl font-bold tracking-tight text-violet-700">{a.score} điểm</span>
        </div>
        <h3 className="mt-1 font-semibold text-gray-900">{a.title}</h3>
        <p className="text-[13px] text-gray-500">
          {a.areaTitle}
          {a.reasons.length > 0 && ` — ${a.reasons.slice(0, 3).join(', ').toLowerCase()}`}. Xong việc này sẽ gỡ nút thắt
          cho các việc sau:
        </p>
        <div className="mt-1 flex flex-col gap-1">
          {a.unlocks.map((u) => (
            <Link
              key={u.nodeId}
              href={growthRoutes.node(u.nodeId)}
              className="flex items-center gap-2 rounded-lg bg-[#eaedff] px-2 py-1 transition hover:bg-[#e2e7ff]"
            >
              <CircleArrowRight size={17} className="shrink-0 text-violet-700" />
              <span className="truncate text-[13px] font-medium text-gray-900">Mở khóa: {u.title}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between pt-2 text-[13px] text-gray-500">
        <span className="flex items-center gap-1">
          <Timer size={16} className="text-gray-400" />
          Đã đầu tư: {a.todos.minutes > 0 ? formatMinutes(a.todos.minutes) : '0 phút'} (28 ngày)
        </span>
        <Link href={growthRoutes.map} className="text-xs font-semibold text-violet-700 hover:underline">
          Xem trên sơ đồ
        </Link>
      </div>
    </div>
  );
}

function EmptyCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col justify-center gap-1 rounded-2xl border border-dashed border-[#ccc3d8] bg-white/60 p-4 text-center">
      <span className="font-semibold text-gray-700">{title}</span>
      <span className="text-[13px] text-gray-500">{hint}</span>
    </div>
  );
}

/** Ma trận giá trị: việc cộng hưởng nhiều lĩnh vực nhất trong kỳ + mắt xích mở khóa đáng đầu tư nhất. */
export function LeverageCards({
  synergy,
  unlock,
  colorOf,
}: {
  synergy: SynergyStat | null;
  unlock: PlanAction | null;
  colorOf: (areaId: number) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
            <Network size={19} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Ma trận giá trị &amp; mở khóa đòn bẩy</h2>
            <p className="text-[13px] text-gray-500">Việc tác động nhiều lĩnh vực cùng lúc và mắt xích mở đường cho việc khác</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {synergy ? (
          <SynergyCard s={synergy} colorOf={colorOf} />
        ) : (
          <EmptyCard
            title="Chưa có việc cộng hưởng trong kỳ"
            hint="Gắn một việc với 2 lĩnh vực (VD nghe podcast tiếng Anh khi chạy bộ) để một lần làm, hai lần tiến bộ."
          />
        )}
        {unlock ? (
          <UnlockCard a={unlock} />
        ) : (
          <EmptyCard
            title="Chưa có mắt xích mở khóa"
            hint="Nối liên kết “điều kiện trước” trên sơ đồ để biết việc nào mở đường cho việc khác."
          />
        )}
      </div>
    </div>
  );
}
