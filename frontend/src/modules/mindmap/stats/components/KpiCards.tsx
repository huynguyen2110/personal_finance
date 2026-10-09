'use client';

import { ArrowDown, ArrowUp, CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/modules/mindmap/lib/utils';
import { RangeStats } from '../api';

const TARGET_RATE = 75;

function Card({
  label,
  icon,
  bar,
  children,
  footer,
}: {
  label: string;
  icon: React.ReactNode;
  bar: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline gap-1">{children}</div>
      <div className="mt-2 flex items-center justify-between gap-2 pt-1 text-[11px] font-semibold">{footer}</div>
      <div className="absolute right-0 bottom-0 left-0 h-1" style={{ background: bar }} />
    </div>
  );
}

function Delta({ now, before, unit }: { now: number; before: number; unit: string }) {
  const diff = now - before;
  if (diff === 0) return <span className="text-gray-400">= kỳ trước</span>;
  const up = diff > 0;
  return (
    <span className={cn('flex items-center', up ? 'text-teal-700' : 'text-red-600')}>
      {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      {up ? '+' : '−'}
      {Math.abs(diff)} {unit} so với kỳ trước
    </span>
  );
}

/** 4 chỉ số chính của kỳ: tổng việc, đã xong, tỷ lệ, thời gian đầu tư. */
export function KpiCards({ data, elapsed }: { data: RangeStats; elapsed: number }) {
  const { total, done, minutes } = data.totals;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const activeDays = data.days.filter((d) => d.total > 0).length;
  const perDay = elapsed ? Math.round(minutes / elapsed) : 0;
  const hours = minutes / 60;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Tổng todo đã lên lịch"
        bar="linear-gradient(90deg,#7c3aed,#006a61)"
        icon={
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaedff] text-gray-600">
            <ListChecks size={18} />
          </span>
        }
        footer={
          <>
            <span className="text-gray-500">
              Có việc {activeDays}/{data.days.length} ngày
            </span>
            <span className="text-gray-400">Kỳ trước: {data.prevTotals.total}</span>
          </>
        }
      >
        <span className="text-[28px] leading-9 font-bold tracking-tight text-gray-900">{total}</span>
        <span className="text-[13px] text-gray-500">nhiệm vụ</span>
      </Card>

      <Card
        label="Đã hoàn thành"
        bar="#006a61"
        icon={
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <CheckCircle2 size={18} />
          </span>
        }
        footer={
          <>
            <Delta now={done} before={data.prevTotals.done} unit="việc" />
            <span className="text-gray-400">{total - done} còn lại</span>
          </>
        }
      >
        <span className="text-[28px] leading-9 font-bold tracking-tight text-gray-900">{done}</span>
        <span className="text-[13px] text-gray-500">/ {total} nhiệm vụ</span>
      </Card>

      <Card
        label="Tỷ lệ hoàn thành"
        bar="#7c3aed"
        icon={
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eaedff" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${rate} 100`}
              pathLength={100}
            />
          </svg>
        }
        footer={
          <>
            <span className="text-gray-500">Mục tiêu ≥ {TARGET_RATE}%</span>
            {total > 0 && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5',
                  rate >= TARGET_RATE ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-700',
                )}
              >
                {rate >= TARGET_RATE ? 'Đạt' : 'Chậm nhịp'}
              </span>
            )}
          </>
        }
      >
        <span className="text-[28px] leading-9 font-bold tracking-tight text-violet-700">{rate}%</span>
        <span className="text-[13px] text-gray-500">tiến độ</span>
      </Card>

      <Card
        label="Thời gian đầu tư"
        bar="#6bd8cb"
        icon={
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e2e7ff] text-gray-900">
            <Clock size={18} />
          </span>
        }
        footer={
          <>
            <span className="text-gray-500">TB {perDay} phút/ngày</span>
            <Delta now={Math.round(minutes)} before={Math.round(data.prevTotals.minutes)} unit="phút" />
          </>
        }
      >
        <span className="text-[28px] leading-9 font-bold tracking-tight text-gray-900">
          {hours >= 1 ? hours.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : minutes}
        </span>
        <span className="text-[13px] text-gray-500">{hours >= 1 ? 'giờ' : 'phút'}</span>
      </Card>
    </div>
  );
}
