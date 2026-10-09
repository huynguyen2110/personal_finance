'use client';

import { Info, Play, Sigma, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { toDateKey } from '@/modules/mindmap/lib/utils';
import { useCreateTodo, useTodos } from '@/modules/mindmap/todos/hooks';
import { PlanAction } from '../api';

/** Công thức chấm điểm thật (khớp backend utils/plan.ts). */
export function ScoringCard() {
  const [open, setOpen] = useState(false);
  const rows: [string, string, string][] = [
    ['Ưu tiên (của hành động, trống thì lấy lĩnh vực)', 'Trọng số 40%', 'text-gray-900'],
    ['Độ dễ', 'Trọng số 20%', 'text-gray-900'],
    ['Đòn bẩy: mở khóa + bổ trợ (tối đa 3 việc)', 'Trọng số 20%', 'text-violet-700'],
    ['Rẻ / nhanh (so với việc tốn nhất)', '10% + 10%', 'text-teal-700'],
    ['Đang làm dở', '+5 điểm', 'text-teal-700'],
  ];
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-gray-900">
          <Sigma size={19} className="text-violet-700" /> Cách tính điểm ưu tiên
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Giải thích thêm"
          className="rounded-lg p-1 text-gray-500 hover:bg-[#eaedff] hover:text-gray-900"
        >
          <Info size={17} />
        </button>
      </div>
      <div className="flex flex-col gap-1 rounded-xl bg-[#e2e7ff]/60 p-3 font-mono text-xs leading-relaxed text-gray-900">
        <div className="font-bold text-violet-700">
          Điểm = 40·Ưu tiên + 20·Dễ + 20·Đòn bẩy + 10·Rẻ + 10·Nhanh
        </div>
        <div className="pt-1 font-sans text-[11px] text-gray-500">
          Mỗi phần chuẩn hóa 0–1; thiếu giá trị thì tính trung bình (0,5). Việc đã xong, đang bị chặn hoặc còn
          bước con chưa xong không được gợi ý.
        </div>
      </div>
      <div className="flex flex-col gap-1 text-[11px] font-semibold">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-2 text-gray-500">
            <span>{label}</span>
            <span className={`shrink-0 ${tone}`}>{value}</span>
          </div>
        ))}
      </div>
      {open && (
        <p className="rounded-lg bg-[#f2f3ff] p-2 text-[12px] text-gray-600">
          Gán thuộc tính Ưu tiên, Độ khó, Thời gian, Chi phí cho hành động (trên Sơ đồ hoặc trang nhánh) và nối
          liên kết <b>điều kiện trước</b> / <b>bổ trợ</b> để điểm phản ánh đúng đòn bẩy của từng việc.
        </p>
      )}
    </section>
  );
}

/** Việc điểm cao nhất chưa có trong todo hôm nay: thêm vào hôm nay rồi chuyển sang trang Todo để bắt đầu. */
export function TopPickCard({ actions }: { actions: PlanAction[] }) {
  const router = useRouter();
  const today = toDateKey(new Date());
  const { data: todayTodos } = useTodos(today);
  const createTodo = useCreateTodo();
  const linked = new Set((todayTodos ?? []).flatMap((t) => t.nodes.map((n) => n.id)));
  const pick = actions.find((a) => !linked.has(a.nodeId));
  if (!pick) return null;

  const why = pick.reasons.slice(0, 3).join(' • ');
  return (
    <section className="relative flex flex-col gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-200/50 via-white to-white p-4 shadow-sm">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-violet-700 uppercase">
        <Zap size={17} /> Đáng làm nhất hôm nay
      </span>
      <h4 className="font-semibold text-gray-900">{pick.title}</h4>
      <p className="text-[13px] text-gray-500">
        {pick.areaTitle}
        {why && ` — ${why.toLowerCase()}`}. Chưa có trong todo hôm nay.
      </p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-semibold text-teal-700">Điểm gợi ý: {pick.score}</span>
        <button
          type="button"
          disabled={createTodo.isPending}
          onClick={() =>
            createTodo.mutate(
              { title: pick.title, date: today, nodeIds: [pick.nodeId], durationMinutes: 25 },
              { onSuccess: () => router.push(growthRoutes.todos) },
            )
          }
          className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-50"
        >
          <Play size={15} /> Bắt đầu ngay
        </button>
      </div>
    </section>
  );
}
