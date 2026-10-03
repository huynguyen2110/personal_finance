'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { saveBudgets } from '../lib';
import type { BudgetLine, GroupBudgetStatus } from '../types';

type Scope = 'DEFAULT' | 'MONTH';

interface Props {
  group: GroupBudgetStatus;
  lines: BudgetLine[];
  month: string;
  onClose: () => void;
  onSaved: () => void;
}

const nf = new Intl.NumberFormat('vi-VN');
const round100k = (v: number) => Math.ceil(v / 100_000) * 100_000;

// Đặt một hạn mức chung cho cả nhóm chi tiêu (VD di chuyển, điện nước: tháng nhiều tháng ít, chỉ cần kiểm soát tổng)
export default function GroupBudgetModal({ group, lines, month, onClose, onSaved }: Props) {
  const [scope, setScope] = useState<Scope>(group.source === 'MONTH' ? 'MONTH' : 'DEFAULT');
  const initial = (sc: Scope) => (sc === 'MONTH' ? (group.source === 'MONTH' ? group.amount : null) : group.defaultAmount);
  const [value, setValue] = useState(() => {
    // Chưa đặt: gợi ý theo mức chi tháng trước nhưng không thấp hơn tổng hạn mức các danh mục trong nhóm
    const v = initial(scope) ?? (Math.max(group.prevSpent > 0 ? round100k(group.prevSpent) : 0, group.categoriesBudget ?? 0) || null);
    return v ? String(v) : '';
  });
  const [saving, setSaving] = useState(false);

  const amountNum = Number(value.replace(/[^\d]/g, ''));
  const existing = initial(scope);
  const parents = group.categoryIds.map((id) => lines.find((l) => l.categoryId === id)).filter((l): l is BudgetLine => !!l);

  // Hạn mức đã đặt cho các danh mục trong nhóm theo đúng phạm vi đang sửa → hạn mức nhóm không được thấp hơn
  const categoriesSum = useMemo(() => {
    const part = (p: BudgetLine): number | null => {
      if (scope === 'MONTH') return p.amount;
      if (p.defaultAmount !== null) return p.defaultAmount;
      const kids = lines.filter((l) => l.parentId === p.categoryId && l.defaultAmount !== null);
      return kids.length ? kids.reduce((s, l) => s + (l.defaultAmount ?? 0), 0) : null;
    };
    const parts = parents.map(part).filter((a): a is number => a !== null);
    return parts.length ? parts.reduce((s, a) => s + a, 0) : null;
  }, [parents, lines, scope]);
  const floorError = amountNum > 0 && categoriesSum !== null && amountNum < categoriesSum ? `Các danh mục trong nhóm đang đặt tổng ${formatVND(categoriesSum)}, hạn mức nhóm không được thấp hơn` : null;

  const chips = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    if (group.prevSpent > 0) out.push({ label: 'Bằng tháng trước', value: round100k(group.prevSpent) });
    if (group.spent > 0) out.push({ label: 'Theo mức đã chi', value: round100k(group.spent) });
    if (categoriesSum) out.push({ label: 'Tổng các danh mục', value: categoriesSum });
    if (group.defaultAmount && scope === 'MONTH') out.push({ label: 'Như mặc định', value: group.defaultAmount });
    return out.filter((c, i, a) => a.findIndex((x) => x.value === c.value) === i);
  }, [group, categoriesSum, scope]);

  async function put(amount: number | null) {
    setSaving(true);
    try {
      await saveBudgets([{ groupId: group.groupId, month: scope === 'DEFAULT' ? '*' : month, amount }]);
      toast.success(amount === null ? 'Đã bỏ hạn mức nhóm' : 'Đã lưu hạn mức nhóm');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Hạn mức nhóm · ${group.name}`} size="md">
      <form
        className="space-y-4 font-jakarta"
        onSubmit={(e) => {
          e.preventDefault();
          if (!amountNum) return toast.error('Nhập số tiền hạn mức');
          if (floorError) return toast.error(floorError);
          put(amountNum);
        }}
      >
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
          <CategoryIcon icon={group.icon} color={group.color} />
          <div className="text-xs text-slate-600 fin-num min-w-0">
            <p>
              Tháng này đã chi <b className="text-slate-900">{formatVND(group.spent)}</b> ({group.count} giao dịch) · tháng trước {formatVND(group.prevSpent)}
            </p>
            <p className="truncate" title={parents.map((p) => p.name).join(', ')}>
              Gồm: {parents.length ? parents.map((p) => p.name).join(', ') : 'chưa có danh mục'}
            </p>
          </div>
        </div>

        <div>
          <span className="fin-label block mb-1.5">Áp dụng cho</span>
          <div className="inline-flex p-1 rounded-lg bg-slate-100 w-full">
            {(
              [
                ['DEFAULT', 'Mọi tháng (mặc định)'],
                ['MONTH', `Chỉ ${formatMonthLabel(month)}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={scope === k}
                onClick={() => {
                  setScope(k);
                  const v = initial(k);
                  if (v) setValue(String(v));
                }}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  scope === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="fin-label block mb-1.5">Hạn mức cả nhóm (₫)</span>
          <input
            inputMode="numeric"
            autoFocus
            className="input-field fin-num !text-lg !font-semibold"
            value={amountNum ? nf.format(amountNum) : value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="VD: 2.500.000"
            aria-invalid={!!floorError}
          />
          {floorError ? (
            <span className="block text-xs text-rose-600 mt-1.5 fin-num">{floorError}</span>
          ) : categoriesSum !== null ? (
            <span className="block text-xs text-slate-500 mt-1.5 fin-num">
              Các danh mục trong nhóm đang đặt tổng <b className="text-slate-800">{formatVND(categoriesSum)}</b>
            </span>
          ) : null}
        </label>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setValue(String(c.value))}
                className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-teal-600 hover:text-teal-700 fin-num"
              >
                {c.label}: {nf.format(c.value)} ₫
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {existing !== null && (
            <button type="button" className="fin-btn fin-btn-ghost text-rose-600" disabled={saving} onClick={() => put(null)}>
              <Trash2 className="w-4 h-4" /> Bỏ hạn mức {scope === 'MONTH' ? 'riêng tháng' : 'mặc định'}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="fin-btn fin-btn-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu hạn mức'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
