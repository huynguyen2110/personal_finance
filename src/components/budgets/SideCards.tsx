'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, ChartColumn, CircleCheck, Info, Scale } from 'lucide-react';
import { api } from '@/lib/client';
import { formatCompactVND, formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { projectedSpend, suggestRebalance, type MonthClock } from '@/lib/budgetInsights';
import type { BudgetLine, BudgetMonthTotals } from '@/lib/budget';

// ─── Gợi ý cân đối hạn mức (quy tắc đơn giản, không phải AI) ───

export function RebalanceCard({
  lines,
  month,
  clock,
  onApplied,
}: {
  lines: BudgetLine[];
  month: string;
  clock: MonthClock;
  onApplied: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const budgeted = lines.filter((l) => l.amount !== null);
  if (clock.phase !== 'current' || !budgeted.length) return null;

  const plan = suggestRebalance(lines, clock);
  const totalBudget = budgeted.reduce((s, l) => s + (l.amount ?? 0), 0);
  const projected = budgeted.reduce((s, l) => s + projectedSpend(l.spent, clock), 0);
  const forecast = totalBudget - projected;

  async function apply() {
    if (!plan) return;
    setBusy(true);
    try {
      await api('/api/budgets', {
        method: 'PUT',
        body: JSON.stringify({ items: plan.updates.map((u) => ({ ...u, month })) }),
      });
      toast.success(`Đã cân đối ${plan.moves.length} khoản cho ${formatMonthLabel(month)}`);
      onApplied();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fin-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center">
          <Scale className="w-4 h-4" aria-hidden />
        </span>
        <h2 className="font-jakarta text-[16px] font-semibold text-slate-900">Gợi ý cân đối hạn mức</h2>
      </div>

      {!plan ? (
        <p className="flex items-start gap-2 text-xs text-slate-600">
          <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          Chưa có danh mục nào vượt hạn mức trong {formatMonthLabel(month)}.
        </p>
      ) : dismissed ? (
        <button type="button" className="text-xs text-teal-700 font-semibold self-start hover:underline" onClick={() => setDismissed(false)}>
          Xem lại gợi ý
        </button>
      ) : (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col gap-2.5">
          <p className="text-xs text-slate-700 leading-relaxed">
            {plan.moves.length ? (
              <>
                Các danh mục vượt tổng <b className="text-rose-600 fin-num">{formatVND(plan.deficit)}</b>. Có thể dời{' '}
                <b className="fin-num">{formatVND(plan.covered)}</b> từ danh mục dự kiến còn dư (nếu giữ nhịp chi hiện tại):
              </>
            ) : (
              <>
                Các danh mục vượt tổng <b className="text-rose-600 fin-num">{formatVND(plan.deficit)}</b>, nhưng không danh mục nào
                dự kiến còn dư để bù. Cân nhắc tăng hạn mức.
              </>
            )}
          </p>
          {plan.moves.length > 0 && (
            <ul className="space-y-1">
              {plan.moves.map((m) => (
                <li key={`${m.fromId}-${m.toId}`} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="truncate">{m.fromName}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden />
                  <span className="truncate font-semibold">{m.toName}</span>
                  <span className="ml-auto fin-num font-semibold">{formatVND(m.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {plan.moves.length > 0 && (
            <div className="flex gap-2">
              <button type="button" className="fin-btn fin-btn-primary fin-btn-sm flex-1 justify-center" disabled={busy} onClick={apply}>
                {busy ? 'Đang áp dụng…' : `Áp dụng riêng ${formatMonthLabel(month)}`}
              </button>
              <button type="button" className="fin-btn fin-btn-outline fin-btn-sm" onClick={() => setDismissed(true)}>
                Bỏ qua
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Dự báo cuối tháng (giữ nhịp hiện tại):</span>
        <span className={`fin-num font-semibold ${forecast >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
          {forecast >= 0 ? `Dư ~${formatCompactVND(forecast)} ₫` : `Thiếu ~${formatCompactVND(-forecast)} ₫`}
        </span>
      </div>
    </section>
  );
}

// ─── So sánh 3 tháng: chi ở các danh mục có hạn mức so với tổng hạn mức ───

export function HistoryCard({ history, month }: { history: BudgetMonthTotals[]; month: string }) {
  const max = Math.max(1, ...history.flatMap((h) => [h.spentBudgeted, h.budget]));
  return (
    <section className="fin-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-jakarta text-[16px] font-semibold text-slate-900">So sánh 3 tháng gần nhất</h2>
        <ChartColumn className="w-4 h-4 text-slate-400" aria-hidden />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-teal-700" /> Đã chi (danh mục có hạn mức)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-slate-900" /> Hạn mức
        </span>
      </div>
      <div className="flex items-end justify-between gap-4 h-32 px-1" role="img" aria-label="Biểu đồ chi so với hạn mức 3 tháng">
        {history.map((h) => {
          const current = h.month === month;
          const over = h.budget > 0 && h.spentBudgeted > h.budget;
          return (
            <div key={h.month} className="flex-1 h-full flex flex-col justify-end items-center relative" title={`${formatMonthLabel(h.month)}: chi ${formatVND(h.spentBudgeted)} / hạn mức ${formatVND(h.budget)}`}>
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t ${current ? (over ? 'bg-rose-500' : 'bg-teal-700') : 'bg-slate-300'}`}
                  style={{ height: `${(h.spentBudgeted / max) * 100}%`, minHeight: h.spentBudgeted ? 2 : 0 }}
                />
                {h.budget > 0 && (
                  <div className="absolute inset-x-[-4px] border-t-2 border-slate-900" style={{ bottom: `${(h.budget / max) * 100}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-4 px-1">
        {history.map((h) => (
          <div key={h.month} className="flex-1 text-center">
            <p className={`fin-label !text-[10px] ${h.month === month ? '!text-teal-700' : ''}`}>
              {h.month === month ? `${formatMonthLabel(h.month)} (nay)` : formatMonthLabel(h.month)}
            </p>
            <p className="text-xs font-semibold text-slate-900 fin-num">{formatCompactVND(h.spentBudgeted)}</p>
            <p className="text-[11px] text-slate-500 fin-num">/ {h.budget ? formatCompactVND(h.budget) : '—'}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-2 text-center">
        <Link href="/reports" className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1">
          Xem thống kê chi tiết <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

// ─── Giải thích cách hạn mức hoạt động ───

export function HowItWorksCard() {
  return (
    <section className="fin-card p-4 flex flex-col gap-2">
      <h2 className="font-jakarta text-[16px] font-semibold text-slate-900 flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-400" aria-hidden /> Cách hạn mức hoạt động
      </h2>
      <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
        <li>
          <b className="text-slate-800">Mặc định hàng tháng</b>: tự áp dụng cho mọi tháng, không cần sao chép.
        </li>
        <li>
          <b className="text-slate-800">Riêng tháng</b>: ghi đè cho đúng một tháng (VD tháng có khoản chi lớn).
        </li>
        <li>Từ 80% hạn mức là “sắp chạm”, quá 100% là “vượt”. Tổng quan cũng hiện cảnh báo này.</li>
        <li>Giao dịch loại khỏi thống kê (chuyển nội bộ) không tính vào hạn mức.</li>
      </ul>
    </section>
  );
}
