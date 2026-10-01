'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { saveBudgets } from '../lib';
import { formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { orderByTree } from '../utils/budget-insights';
import type { BudgetLine } from '../types';

type Scope = 'DEFAULT' | 'MONTH';

interface Props {
  lines: BudgetLine[];
  month: string;
  // Có: sửa hạn mức của danh mục này; không: chọn danh mục để đặt hạn mức mới
  line: BudgetLine | null;
  onClose: () => void;
  onSaved: () => void;
}

const nf = new Intl.NumberFormat('vi-VN');
const round100k = (v: number) => Math.ceil(v / 100_000) * 100_000;

export default function BudgetEditModal({ lines, month, line, onClose, onSaved }: Props) {
  const [categoryId, setCategoryId] = useState<number>(
    line?.categoryId ?? lines.find((l) => l.amount === null)?.categoryId ?? lines[0]?.categoryId ?? 0
  );
  const current = lines.find((l) => l.categoryId === categoryId) ?? null;
  const [scope, setScope] = useState<Scope>(line?.source === 'MONTH' ? 'MONTH' : 'DEFAULT');
  const initial = (l: BudgetLine | null, sc: Scope) =>
    l ? (sc === 'MONTH' ? (l.source === 'MONTH' ? l.amount : null) : l.defaultAmount) : null;
  const [value, setValue] = useState(() => {
    const v = initial(current, scope) ?? (line && line.amount !== null && line.spent > line.amount ? round100k(line.spent) : null);
    return v ? String(v) : '';
  });
  const [saving, setSaving] = useState(false);

  const amountNum = Number(value.replace(/[^\d]/g, ''));
  const existing = initial(current, scope);

  // Trần của cha: hạn mức này + các con khác không được vượt hạn mức cha; cha không được hạ dưới tổng các con.
  // Theo đúng phạm vi đang sửa: mặc định so với mặc định, riêng tháng so với hạn mức hiệu lực tháng đó.
  const effFor = (l: BudgetLine) => (scope === 'DEFAULT' ? l.defaultAmount : l.amount);
  const parent = current?.parentId !== null ? lines.find((l) => l.categoryId === current?.parentId) : undefined;
  const children = current ? lines.filter((l) => l.parentId === current.categoryId) : [];
  const ceiling = parent ? effFor(parent) : null;
  const siblingsSum = parent ? children.length === 0 ? lines.filter((l) => l.parentId === parent.categoryId && l.categoryId !== current?.categoryId).reduce((s, l) => s + (effFor(l) ?? 0), 0) : 0 : 0;
  const childrenSum = children.reduce((s, l) => s + (effFor(l) ?? 0), 0);
  const maxAllowed = ceiling !== null ? Math.max(0, ceiling - siblingsSum) : null;
  const ceilingError =
    amountNum > 0 && maxAllowed !== null && amountNum > maxAllowed
      ? `Vượt trần của "${parent!.name}": tối đa ${formatVND(maxAllowed)} (trần ${formatVND(ceiling!)}, các con khác đang dùng ${formatVND(siblingsSum)})`
      : amountNum > 0 && children.length > 0 && amountNum < childrenSum
        ? `Các danh mục con đang đặt tổng ${formatVND(childrenSum)}, hạn mức cha không được thấp hơn`
        : null;

  // Gợi ý nhanh từ dữ liệu thật
  const chips = useMemo(() => {
    if (!current) return [];
    const out: { label: string; value: number }[] = [];
    if (current.prevSpent > 0) out.push({ label: `Bằng tháng trước`, value: round100k(current.prevSpent) });
    if (current.spent > 0) out.push({ label: 'Theo mức đã chi', value: round100k(current.spent) });
    if (current.defaultAmount && scope === 'MONTH') out.push({ label: 'Như mặc định', value: current.defaultAmount });
    return out.filter((c, i, a) => a.findIndex((x) => x.value === c.value) === i);
  }, [current, scope]);

  async function put(amount: number | null) {
    if (!categoryId) return;
    setSaving(true);
    try {
      await saveBudgets([{ categoryId, month: scope === 'DEFAULT' ? '*' : month, amount }]);
      toast.success(amount === null ? 'Đã bỏ hạn mức' : 'Đã lưu hạn mức');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={line ? `Hạn mức · ${line.name}` : 'Đặt hạn mức mới'} size="md">
      <form
        className="space-y-4 font-jakarta"
        onSubmit={(e) => {
          e.preventDefault();
          if (!amountNum) return toast.error('Nhập số tiền hạn mức');
          if (ceilingError) return toast.error(ceilingError);
          put(amountNum);
        }}
      >
        {!line && (
          <label className="block">
            <span className="fin-label block mb-1.5">Danh mục chi</span>
            <select
              className="select-field"
              value={categoryId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setCategoryId(id);
                const l = lines.find((x) => x.categoryId === id) ?? null;
                const v = initial(l, scope);
                setValue(v ? String(v) : '');
              }}
            >
              {orderByTree(lines).map((l) => (
                <option key={l.categoryId} value={l.categoryId}>
                  {l.parentId !== null ? '   └ ' : ''}
                  {l.name}
                  {l.source === 'CHILDREN' ? ` — tổng các con ${formatVND(l.amount ?? 0)}` : l.amount !== null ? ` — đang ${formatVND(l.amount)}` : ' — chưa đặt'}
                </option>
              ))}
            </select>
          </label>
        )}

        {current && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <CategoryIcon icon={current.icon} color={current.color} />
            <div className="text-xs text-slate-600 fin-num">
              <p>
                Tháng này đã chi <b className="text-slate-900">{formatVND(current.spent)}</b> ({current.count} giao dịch)
              </p>
              <p>Tháng trước: {formatVND(current.prevSpent)}</p>
              {lines.some((l) => l.parentId === current.categoryId) && (
                <p className="text-teal-800 mt-0.5">Danh mục cha: số đã chi gồm cả các con; hạn mức đặt ở đây bao trùm toàn bộ nhóm.</p>
              )}
            </div>
          </div>
        )}

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
                  const v = initial(current, k);
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
          <p className="text-xs text-slate-500 mt-1.5">
            {scope === 'DEFAULT'
              ? 'Tự áp dụng cho mọi tháng chưa đặt riêng — không cần sao chép mỗi tháng.'
              : `Chỉ ghi đè cho ${formatMonthLabel(month)}; các tháng khác vẫn dùng mức mặc định.`}
          </p>
        </div>

        <label className="block">
          <span className="fin-label block mb-1.5">Hạn mức (₫)</span>
          <input
            inputMode="numeric"
            autoFocus
            className="input-field fin-num !text-lg !font-semibold"
            value={amountNum ? nf.format(amountNum) : value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="VD: 3.000.000"
            aria-invalid={!!ceilingError}
          />
          {ceilingError ? (
            <span className="block text-xs text-rose-600 mt-1.5 fin-num">{ceilingError}</span>
          ) : maxAllowed !== null ? (
            <span className="block text-xs text-slate-500 mt-1.5 fin-num">
              Trần nhóm cha &ldquo;{parent!.name}&rdquo;: {formatVND(ceiling!)} · các con khác đang dùng {formatVND(siblingsSum)} · tối đa cho danh mục này{' '}
              <b className="text-slate-800">{formatVND(maxAllowed)}</b>
            </span>
          ) : children.length > 0 && childrenSum > 0 ? (
            <span className="block text-xs text-slate-500 mt-1.5 fin-num">
              Các danh mục con đang đặt tổng <b className="text-slate-800">{formatVND(childrenSum)}</b> · hạn mức cha là trần của cả nhóm
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
