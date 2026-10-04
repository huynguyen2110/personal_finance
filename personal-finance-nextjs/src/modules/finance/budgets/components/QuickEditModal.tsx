'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CornerDownRight } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { saveBudgets } from '../lib';
import { formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import { childrenByParent, orderByTree, topLevelLines } from '../utils/budget-insights';
import type { BudgetLine } from '../types';

const nf = new Intl.NumberFormat('vi-VN');
const toNum = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[^\d]/g, '')) || 0);
const fmt = (s: string) => {
  const n = toNum(s);
  return n === null ? '' : nf.format(n);
};

// Sửa hạn mức của mọi danh mục chi trong một màn: cột mặc định + cột riêng tháng (để trống = không có).
// Danh mục con thụt vào dưới cha; tổng chỉ cộng theo cha (cha đặt riêng thì lấy của cha, không thì cộng các con).
export default function QuickEditModal({
  lines,
  month,
  onClose,
  onSaved,
}: {
  lines: BudgetLine[];
  month: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initDefault = Object.fromEntries(lines.map((l) => [l.categoryId, l.defaultAmount !== null ? String(l.defaultAmount) : '']));
  const initMonth = Object.fromEntries(
    lines.map((l) => [l.categoryId, l.source === 'MONTH' && l.amount !== null ? String(l.amount) : ''])
  );
  const [def, setDef] = useState<Record<number, string>>(initDefault);
  const [own, setOwn] = useState<Record<number, string>>(initMonth);
  const [saving, setSaving] = useState(false);

  const kids = childrenByParent(lines);
  const effective = (l: BudgetLine): number | null => toNum(own[l.categoryId]) ?? toNum(def[l.categoryId]);
  const totalEffective = topLevelLines(lines).reduce((s, p) => {
    const self = effective(p);
    if (self !== null) return s + self;
    return s + (kids.get(p.categoryId) ?? []).reduce((c, l) => c + (effective(l) ?? 0), 0);
  }, 0);

  async function save() {
    const items: { categoryId: number; month: string; amount: number | null }[] = [];
    for (const l of lines) {
      const d = toNum(def[l.categoryId]);
      if (d !== toNum(initDefault[l.categoryId])) items.push({ categoryId: l.categoryId, month: '*', amount: d });
      const m = toNum(own[l.categoryId]);
      if (m !== toNum(initMonth[l.categoryId])) items.push({ categoryId: l.categoryId, month, amount: m });
    }
    if (!items.length) return onClose();

    // Trần của cha: kiểm tra riêng cột mặc định và cột tháng (hiệu lực = riêng tháng ?? mặc định)
    for (const p of topLevelLines(lines)) {
      const children = kids.get(p.categoryId) ?? [];
      if (!children.length) continue;
      const checks: [string, (l: BudgetLine) => number | null][] = [
        ['mặc định', (l) => toNum(def[l.categoryId])],
        [formatMonthLabel(month), effective],
      ];
      for (const [label, eff] of checks) {
        const ceiling = eff(p);
        if (ceiling === null) continue;
        const sum = children.reduce((s, l) => s + (eff(l) ?? 0), 0);
        if (sum > ceiling) {
          return toast.error(`Tổng hạn mức các con của "${p.name}" (${formatVND(sum)}) vượt trần ${formatVND(ceiling)} (${label}). Giảm hạn mức con hoặc tăng hạn mức cha.`);
        }
      }
    }
    setSaving(true);
    try {
      await saveBudgets(items);
      toast.success(`Đã lưu ${items.length} thay đổi`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Chỉnh sửa nhanh hạn mức" size="lg">
      <div className="font-jakarta space-y-3">
        <p className="text-xs text-slate-500">
          Cột <b>Mặc định</b> áp dụng mọi tháng. Cột <b>Riêng {formatMonthLabel(month)}</b> ghi đè cho tháng đang xem — để trống
          nếu muốn dùng mặc định. Hạn mức của danh mục cha bao trùm các con; không đặt cho cha thì tổng lấy từ các con.
        </p>
        <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="fin-label text-left px-3 py-2">Danh mục</th>
                <th className="fin-label text-right px-3 py-2">Đã chi {formatMonthLabel(month)}</th>
                <th className="fin-label text-right px-3 py-2">Mặc định</th>
                <th className="fin-label text-right px-3 py-2">Riêng {formatMonthLabel(month)}</th>
              </tr>
            </thead>
            <tbody>
              {orderByTree(lines).map((l) => {
                const child = l.parentId !== null;
                return (
                  <tr key={l.categoryId} className={`border-t border-slate-100 ${child ? 'bg-slate-50/60' : ''}`}>
                    <td className={`px-3 py-2 ${child ? 'pl-7' : ''}`}>
                      <span className="flex items-center gap-2">
                        {child && <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />}
                        <CategoryIcon icon={l.icon} color={l.color} size="sm" />
                        <span className={`${child ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>{l.name}</span>
                        {!child && (kids.get(l.categoryId)?.length ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-semibold fin-num">{kids.get(l.categoryId)!.length} con</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 fin-num whitespace-nowrap">{formatVND(l.spent)}</td>
                    <td className="px-2 py-1.5">
                      <input
                        inputMode="numeric"
                        aria-label={`Hạn mức mặc định ${l.name}`}
                        className="input-field !py-1.5 !text-right fin-num"
                        value={fmt(def[l.categoryId] ?? '')}
                        onChange={(e) => setDef((s) => ({ ...s, [l.categoryId]: e.target.value }))}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        inputMode="numeric"
                        aria-label={`Hạn mức riêng tháng ${l.name}`}
                        className="input-field !py-1.5 !text-right fin-num"
                        value={fmt(own[l.categoryId] ?? '')}
                        onChange={(e) => setOwn((s) => ({ ...s, [l.categoryId]: e.target.value }))}
                        placeholder="—"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 fin-num">
            Tổng hạn mức {formatMonthLabel(month)}: <b className="text-slate-900">{formatVND(totalEffective)}</b>
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="fin-btn fin-btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Đang lưu…' : 'Lưu tất cả'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
