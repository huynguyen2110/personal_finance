'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/shared/Modal';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import { saveBudgets } from '../lib';
import { formatVND } from '@/lib/money';
import { formatMonthLabel } from '@/lib/dates';
import type { BudgetLine } from '../types';

const nf = new Intl.NumberFormat('vi-VN');
const toNum = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[^\d]/g, '')) || 0);
const fmt = (s: string) => {
  const n = toNum(s);
  return n === null ? '' : nf.format(n);
};

// Sửa hạn mức của mọi danh mục chi trong một màn: cột mặc định + cột riêng tháng (để trống = không có)
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

  const totalEffective = lines.reduce((s, l) => s + (toNum(own[l.categoryId]) ?? toNum(def[l.categoryId]) ?? 0), 0);

  async function save() {
    const items: { categoryId: number; month: string; amount: number | null }[] = [];
    for (const l of lines) {
      const d = toNum(def[l.categoryId]);
      if (d !== toNum(initDefault[l.categoryId])) items.push({ categoryId: l.categoryId, month: '*', amount: d });
      const m = toNum(own[l.categoryId]);
      if (m !== toNum(initMonth[l.categoryId])) items.push({ categoryId: l.categoryId, month, amount: m });
    }
    if (!items.length) return onClose();
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
          nếu muốn dùng mặc định.
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
              {lines.map((l) => (
                <tr key={l.categoryId} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <CategoryIcon icon={l.icon} color={l.color} size="sm" />
                      <span className="text-slate-900 font-medium">{l.name}</span>
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
              ))}
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
