'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Check, ChevronLeft, ChevronRight, Copy, Pencil, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import CategoryIcon from '@/components/shared/CategoryIcon';
import StatTile from '@/components/shared/StatTile';
import { BudgetBadge, BudgetBar } from '@/components/shared/BudgetStatus';
import { api, qs } from '@/lib/client';
import { formatVND } from '@/lib/money';
import { addMonths, currentMonthVN, formatMonthLabel, monthRange, todayVN } from '@/lib/dates';
import type { BudgetLine } from '@/lib/budget';

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthVN);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loading = loadedMonth !== month;
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    api<{ lines: BudgetLine[] }>(`/api/budgets${qs({ month })}`)
      .then((r) => {
        if (cancelled) return;
        setLines(r.lines);
        setLoadedMonth(month);
      })
      .catch((e: Error) => toast.error(e.message));
    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);

  async function save(categoryId: number, amount: number | null, scope: 'MONTH' | 'DEFAULT') {
    try {
      await api('/api/budgets', {
        method: 'PUT',
        body: JSON.stringify({ categoryId, amount, month: scope === 'DEFAULT' ? '*' : month }),
      });
      toast.success('Đã lưu ngân sách');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function copyPrev() {
    try {
      const r = await api<{ copied: number }>('/api/budgets/copy', { method: 'POST', body: JSON.stringify({ month }) });
      toast.success(r.copied ? `Đã sao chép ${r.copied} hạn mức từ ${formatMonthLabel(addMonths(month, -1))}` : 'Tháng trước không có hạn mức riêng');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const budgeted = lines.filter((l) => l.amount !== null);
  const totalBudget = budgeted.reduce((s, l) => s + (l.amount ?? 0), 0);
  const totalSpentBudgeted = budgeted.reduce((s, l) => s + l.spent, 0);
  const totalSpentAll = lines.reduce((s, l) => s + l.spent, 0);

  // Tiến độ thời gian của tháng (để so với tiến độ chi)
  const { from, to } = monthRange(month);
  const today = todayVN();
  const daysInMonth = Number(to.slice(8, 10));
  const elapsed = today < from ? 0 : today > to ? daysInMonth : Number(today.slice(8, 10));
  const timePct = elapsed / daysInMonth;

  return (
    <div>
      <Header
        title="Ngân sách"
        subtitle="Đặt hạn mức chi cho từng danh mục"
        actions={
          <div className="flex items-center gap-1">
            <button type="button" className="btn-icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Tháng trước">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              className="input-field !w-auto !py-2"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Chọn tháng"
            />
            <button type="button" className="btn-icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Tháng sau">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" className="btn-secondary !py-2 text-sm flex items-center gap-1.5 ml-1" onClick={copyPrev}>
              <Copy className="w-4 h-4" /> Chép từ tháng trước
            </button>
          </div>
        }
      />

      <div className={`px-4 md:px-6 pb-8 space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label={`Tổng ngân sách ${formatMonthLabel(month)}`} value={formatVND(totalBudget)} hint={`${budgeted.length} danh mục có hạn mức`} />
          <StatTile
            label="Đã chi (danh mục có hạn mức)"
            value={formatVND(totalSpentBudgeted)}
            hint={totalBudget ? `${((totalSpentBudgeted / totalBudget) * 100).toFixed(0)}% ngân sách` : undefined}
          />
          <StatTile label="Còn lại" value={formatVND(totalBudget - totalSpentBudgeted)} />
          <StatTile label="Tổng chi cả tháng" value={formatVND(totalSpentAll)} hint={`Đã qua ${elapsed}/${daysInMonth} ngày (${Math.round(timePct * 100)}%)`} />
        </div>

        <section className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs text-text-muted">
            Hạn mức <b className="text-text-secondary">mặc định</b> áp dụng cho mọi tháng; hạn mức <b className="text-text-secondary">riêng tháng</b> ghi đè cho tháng đang xem. Vạch dọc trên thanh là tiến độ thời gian của tháng.
          </div>
          <ul className="divide-y divide-slate-100">
            {lines.map((l) => (
              <BudgetRow key={l.categoryId} line={l} month={month} timePct={timePct} onSave={save} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function BudgetRow({
  line,
  month,
  timePct,
  onSave,
}: {
  line: BudgetLine;
  month: string;
  timePct: number;
  onSave: (categoryId: number, amount: number | null, scope: 'MONTH' | 'DEFAULT') => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [scope, setScope] = useState<'MONTH' | 'DEFAULT'>('DEFAULT');
  const { from, to } = monthRange(month);

  function startEdit() {
    setValue(line.amount ? String(line.amount) : '');
    setScope(line.source === 'MONTH' ? 'MONTH' : 'DEFAULT');
    setEditing(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value.replace(/[^\d]/g, ''));
    await onSave(line.categoryId, value.trim() === '' ? null : n, scope);
    setEditing(false);
  }

  const remaining = line.amount !== null ? line.amount - line.spent : null;

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <CategoryIcon icon={line.icon} color={line.color} />
        <div className="flex-1 min-w-40">
          <Link
            href={`/transactions${qs({ categoryId: line.categoryId, from, to, direction: 'OUT' })}`}
            className="text-sm font-medium text-text hover:underline"
          >
            {line.name}
          </Link>
          <p className="text-xs text-text-muted">
            {line.source === 'MONTH' && 'Hạn mức riêng tháng này'}
            {line.source === 'DEFAULT' && 'Hạn mức mặc định'}
            {line.source === null && 'Chưa đặt hạn mức'}
            {line.source === 'MONTH' && line.defaultAmount !== null && ` (mặc định ${formatVND(line.defaultAmount)})`}
          </p>
        </div>

        {editing ? (
          <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
            <input
              inputMode="numeric"
              className="input-field !w-36 !py-1.5 tabular"
              value={Number(value.replace(/[^\d]/g, '')) ? new Intl.NumberFormat('vi-VN').format(Number(value.replace(/[^\d]/g, ''))) : value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Để trống = bỏ"
              autoFocus
              aria-label={`Hạn mức ${line.name}`}
            />
            <select className="select-field !w-auto !py-1.5 !text-xs" value={scope} onChange={(e) => setScope(e.target.value as 'MONTH' | 'DEFAULT')} aria-label="Phạm vi">
              <option value="DEFAULT">Mặc định mọi tháng</option>
              <option value="MONTH">Chỉ {formatMonthLabel(month)}</option>
            </select>
            <button type="submit" className="btn-icon !p-1.5 !text-success" aria-label="Lưu">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" className="btn-icon !p-1.5" onClick={() => setEditing(false)} aria-label="Hủy">
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm tabular">
                <b className="text-text">{formatVND(line.spent)}</b>
                <span className="text-text-muted"> / {line.amount !== null ? formatVND(line.amount) : '—'}</span>
              </p>
              {remaining !== null && (
                <p className={`text-xs tabular ${remaining < 0 ? 'text-danger' : 'text-text-muted'}`}>
                  {remaining < 0 ? `Vượt ${formatVND(-remaining)}` : `Còn ${formatVND(remaining)}`}
                </p>
              )}
            </div>
            <button type="button" className="btn-icon !p-1.5" onClick={startEdit} aria-label={`Đặt hạn mức ${line.name}`}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {line.amount !== null && !editing && (
        <div className="mt-2 ml-11 flex items-center gap-3">
          <div className="relative flex-1">
            <BudgetBar percent={line.percent} />
            {timePct > 0 && timePct < 1 && (
              <span
                className="absolute -top-1 -bottom-1 w-px bg-text-secondary/60"
                style={{ left: `${timePct * 100}%` }}
                aria-hidden
              />
            )}
          </div>
          <span className="w-12 text-right text-xs tabular text-text-secondary">{Math.round((line.percent ?? 0) * 100)}%</span>
          <span className="w-32">
            <BudgetBadge percent={line.percent} />
          </span>
        </div>
      )}
    </li>
  );
}
