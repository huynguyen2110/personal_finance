'use client';

import {
  Archive,
  ArchiveRestore,
  BellRing,
  Check,
  ChevronRight,
  History,
  Landmark,
  Lightbulb,
  Pencil,
  Plus,
  Repeat,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { formatCompactVND, formatVND } from '@/lib/money';
import { formatVNDate } from '@/lib/dates';
import type { GoalDTO } from '../types';
import { GoalIcon, JARS, PRIORITIES, STATUS, monthText, nf, pct, rateText } from '../utils/goal-meta';

interface Props {
  goal: GoalDTO;
  month: string;
  // Gợi ý trích thặng dư tháng này để về đích ngay
  suggestion: { amount: number; available: number } | null;
  onDeposit: (goal: GoalDTO, preset?: number) => void;
  onEdit: (goal: GoalDTO) => void;
  onHistory: (goal: GoalDTO) => void;
  onArchive: (goal: GoalDTO, archived: boolean) => void;
}

function ProgressBar({ goal, fill }: { goal: GoalDTO; fill: string }) {
  const width = Math.min(100, goal.progress * 100);
  const marker = goal.milestone ? (goal.milestone.amount / goal.targetAmount) * 100 : null;
  return (
    <div
      className="relative w-full h-3 bg-slate-200/70 rounded-full overflow-hidden"
      role="progressbar"
      aria-label={`${goal.name}: đã tích lũy`}
      aria-valuenow={Math.round(goal.progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${width}%`, backgroundColor: fill }} />
      {marker !== null && (
        <div className="absolute inset-y-0 w-0.5 bg-white z-10" style={{ left: `${marker}%` }} title={goal.milestone!.label} aria-hidden />
      )}
    </div>
  );
}

// Dòng giữa dưới thanh tiến độ: mốc an toàn / tốc độ nạp / số cần nạp để kịp hạn
function PaceText({ goal }: { goal: GoalDTO }) {
  if (goal.milestone) {
    return (
      <span className={goal.milestone.reached ? 'text-emerald-700 font-semibold' : ''}>
        {goal.milestone.label} ({formatCompactVND(goal.milestone.amount)}){goal.milestone.reached ? ' ✓' : ''}
      </span>
    );
  }
  if (goal.pace > 0) return <span>Tốc độ nạp thực tế: {nf.format(goal.pace)} ₫/tháng</span>;
  return <span>Chưa có lần nạp nào gần đây</span>;
}

export default function GoalCard({ goal, month, suggestion, onDeposit, onEdit, onHistory, onArchive }: Props) {
  const st = STATUS[goal.status];
  const done = goal.status === 'done';
  const archived = !!goal.archivedAt;
  const jar = JARS[goal.jar];

  // ── Thẻ thu gọn: đã hoàn thành hoặc đã lưu trữ ──
  if (done || archived) {
    return (
      <div className={`fin-card fin-card-hover p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${archived ? 'opacity-75' : ''}`}>
        <div className="flex items-start gap-3 min-w-0">
          <GoalIcon goal={goal} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-[18px] leading-7 font-bold tracking-[-0.015em] text-slate-900 ${done ? 'line-through decoration-slate-400/60' : ''}`}>
                {goal.name}
              </h3>
              {done ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <Check className="w-3.5 h-3.5" aria-hidden /> {pct(goal.progress)} hoàn thành
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">Đã lưu trữ · {pct(goal.progress)}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 fin-num">
              Hũ: {jar.label} ·{' '}
              {done && goal.completedAt
                ? `Đã đạt ${formatVND(goal.targetAmount)} vào ngày ${formatVNDate(goal.completedAt)}`
                : `${formatVND(goal.saved)} / ${formatVND(goal.targetAmount)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {archived ? (
            <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => onArchive(goal, false)}>
              <ArchiveRestore className="w-3.5 h-3.5" /> Bỏ lưu trữ
            </button>
          ) : (
            <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => onArchive(goal, true)}>
              <Archive className="w-3.5 h-3.5" /> Lưu trữ mục tiêu
            </button>
          )}
          <button type="button" className="btn-icon !p-2" title="Lịch sử nạp/rút" aria-label={`Lịch sử nạp/rút của ${goal.name}`} onClick={() => onHistory(goal)}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Thẻ đang tích lũy ──
  const deadlineText = goal.deadline
    ? goal.monthsLeft
      ? `Thời hạn: ${monthText(goal.deadline)} (còn ${goal.monthsLeft} tháng)`
      : `Hạn ${monthText(goal.deadline)} đã qua`
    : null;
  const urgent = goal.thisMonth.dueNow || goal.status === 'behind' || goal.status === 'overdue';
  const showPriority = goal.priority === 'HIGH' && goal.status !== 'behind' && goal.status !== 'overdue';
  const holding = goal.holdingAccount?.name ?? goal.holdingName;

  // Chậm tiến độ: dự kiến trễ bao lâu, cần nạp bao nhiêu
  let warning: string | null = null;
  if (goal.status === 'behind' && goal.deadline) {
    const need = goal.requiredMonthly ? ` Cần nạp ~${nf.format(goal.requiredMonthly)} ₫/tháng để kịp hạn.` : '';
    warning = goal.projectedMonth
      ? `Với ${nf.format(goal.monthlyRate)} ₫/tháng, dự kiến đạt ${monthText(goal.projectedMonth)} — trễ hạn.${need}`
      : `Chưa có kế hoạch nạp nên chưa dự báo được ngày đạt.${need}`;
  } else if (goal.status === 'overdue') {
    warning = `Đã quá hạn ${monthText(goal.deadline!)}, còn thiếu ${formatVND(goal.remaining)}. Gia hạn hoặc nạp thêm để hoàn thành.`;
  }

  return (
    <div className="fin-card fin-card-hover p-4 md:p-6 flex flex-col gap-4">
      {/* Tiêu đề + thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <GoalIcon goal={goal} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[18px] md:text-[20px] leading-7 font-bold tracking-[-0.015em] text-slate-900">{goal.name}</h3>
              {showPriority ? (
                <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${PRIORITIES.HIGH.badge}`}>Ưu tiên: Cao nhất</span>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${st.badge}`}>
                  <st.Icon className="w-3 h-3" aria-hidden /> {st.label}
                </span>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5 fin-num">
              <span>Hũ: {jar.label}</span>
              {deadlineText && (
                <>
                  <span aria-hidden>•</span>
                  <span>{deadlineText}</span>
                </>
              )}
              {goal.projectedMonth && goal.projectedMonth !== goal.deadline && (
                <>
                  <span aria-hidden>•</span>
                  <span>
                    Dự kiến: <strong className="text-slate-900">{monthText(goal.projectedMonth)}</strong>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <button type="button" className="btn-icon !p-2" title="Lịch sử nạp/rút" aria-label={`Lịch sử nạp/rút của ${goal.name}`} onClick={() => onHistory(goal)}>
            <History className="w-5 h-5" />
          </button>
          <button type="button" className="btn-icon !p-2" title="Chỉnh sửa mục tiêu" aria-label={`Sửa ${goal.name}`} onClick={() => onEdit(goal)}>
            <Pencil className="w-[18px] h-[18px]" />
          </button>
          <button type="button" className={`fin-btn ${urgent ? 'fin-btn-primary' : 'fin-btn-outline'}`} onClick={() => onDeposit(goal)}>
            <Plus className="w-4 h-4" /> {urgent ? 'Nạp tiền ngay' : 'Nạp tiền'}
          </button>
        </div>
      </div>

      {/* Tiến độ */}
      <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <span className="text-xs text-slate-500">Đã tích lũy:</span>
            <p className="fin-num">
              <span className="text-[26px] md:text-[32px] leading-10 font-bold tracking-[-0.02em] text-teal-700">{nf.format(goal.saved)}</span>
              <span className="text-sm text-slate-500"> / {formatVND(goal.targetAmount)}</span>
            </p>
          </div>
          <div className="text-right fin-num">
            <span className="text-[26px] md:text-[32px] leading-10 font-bold tracking-[-0.02em]" style={{ color: st.fill }}>
              {pct(goal.progress)}
            </span>
            <p className="text-xs text-slate-500">
              Còn thiếu: <span className="font-semibold text-slate-900">{formatVND(goal.remaining)}</span>
            </p>
          </div>
        </div>
        <ProgressBar goal={goal} fill={st.fill} />
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-[0.04em] text-slate-500 fin-num">
          <span>0 ₫</span>
          <PaceText goal={goal} />
          <span>Mục tiêu {formatCompactVND(goal.targetAmount)}</span>
        </div>
      </div>

      {/* Kế hoạch nạp, nguồn, lãi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 fin-num">
        <span className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          {goal.monthlyPlan ? (
            <span>
              Kế hoạch: <strong className="text-slate-900">{nf.format(goal.monthlyPlan)} ₫/thg</strong>
            </span>
          ) : goal.requiredMonthly ? (
            <span>
              Cần: <strong className="text-slate-900">~{nf.format(goal.requiredMonthly)} ₫/thg</strong> để kịp hạn
            </span>
          ) : (
            <span>Chưa đặt kế hoạch nạp</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
          {goal.coverMonths !== null ? (
            <span>
              Đủ chi tiêu: <strong className="text-slate-900">~{goal.coverMonths.toFixed(1).replace('.', ',')} tháng</strong>
            </span>
          ) : goal.sourceAccount || goal.planDay ? (
            <span>
              Nguồn: <strong className="text-slate-900">{goal.sourceAccount?.name ?? '—'}</strong>
              {goal.planDay ? ` (ngày ${String(goal.planDay).padStart(2, '0')})` : ''}
            </span>
          ) : (
            <span>Đã nạp tháng này: <strong className="text-slate-900">{formatVND(Math.max(0, goal.thisMonth.deposited))}</strong></span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-700 shrink-0" aria-hidden />
          {goal.interestRate ? (
            <span>
              Lãi ước tính: <strong className="text-slate-900">+{nf.format(goal.monthlyInterest)} ₫/thg</strong>
            </span>
          ) : (
            <span>Chưa đặt lãi suất</span>
          )}
        </span>
      </div>

      {/* Nhắc kỳ nạp */}
      {goal.thisMonth.dueNow && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <BellRing className="w-4 h-4 shrink-0" aria-hidden />
            <span className="fin-num">
              Đến kỳ nạp {monthText(month).toLowerCase()}: còn <strong>{formatVND(goal.thisMonth.due)}</strong>
              {goal.thisMonth.deposited > 0 ? ` (đã nạp ${formatVND(goal.thisMonth.deposited)})` : ''}
            </span>
          </span>
          <button type="button" className="fin-btn fin-btn-outline fin-btn-sm shrink-0" onClick={() => onDeposit(goal, goal.thisMonth.due)}>
            Ghi đã nạp
          </button>
        </div>
      )}

      {warning && (
        <p className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-50 text-xs text-slate-700 fin-num">
          <TriangleAlert className={`w-4 h-4 shrink-0 ${goal.status === 'overdue' ? 'text-rose-500' : 'text-amber-500'}`} aria-hidden />
          {warning}
        </p>
      )}

      {/* Nơi gửi + lãi suất */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-teal-700 shrink-0" aria-hidden />
          {holding ? (
            <span>
              Nơi gửi: <strong className="text-slate-900">{holding}</strong>{' '}
              {goal.interestRate ? (
                <span className="text-emerald-700 font-semibold">(Sinh lời {rateText(goal.interestRate)})</span>
              ) : (
                <span className="text-slate-500">(chưa đặt lãi suất)</span>
              )}
            </span>
          ) : (
            <span>Chưa ghi nơi giữ tiền{goal.interestRate ? ` · lãi ${rateText(goal.interestRate)}` : ''}</span>
          )}
          {goal.interestToFinish > 0 && (
            <span className="text-slate-500 fin-num">· lãi đến khi đạt ~{formatVND(goal.interestToFinish)}</span>
          )}
        </span>
        <button type="button" className="fin-btn fin-btn-ghost fin-btn-sm !h-7" onClick={() => onEdit(goal)}>
          <SlidersHorizontal className="w-3.5 h-3.5" /> Cài đặt lãi suất
        </button>
      </div>

      {/* Gợi ý trích thặng dư */}
      {suggestion && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 text-slate-900">
          <Lightbulb className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <span className="text-xs fin-num">
              Gợi ý: thặng dư {monthText(month).toLowerCase()} còn <strong className="text-emerald-700">+{formatVND(suggestion.available)}</strong>{' '}
              chưa phân bổ. Trích {formatVND(suggestion.amount)} để về đích mục tiêu này ngay?
            </span>
            <button type="button" className="fin-btn fin-btn-sm shrink-0 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => onDeposit(goal, suggestion.amount)}>
              Hoàn tất ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
