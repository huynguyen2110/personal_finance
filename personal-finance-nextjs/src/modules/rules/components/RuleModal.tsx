'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/shared/Modal';
import CategorySelect from '@/components/shared/CategorySelect';
import { errorMessage } from '@/lib/api-client';
import type { CategoryDTO } from '@/modules/categories/types';
import { createRule, updateRule } from '../lib';
import type { RuleDTO } from '../types';

export default function RuleModal({
  rule,
  categories,
  onClose,
  onSaved,
}: {
  rule: RuleDTO | null;
  categories: CategoryDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [matchType, setMatchType] = useState<RuleDTO['matchType']>(rule?.matchType ?? 'CONTAINS');
  const [categoryId, setCategoryId] = useState<number | null>(rule?.categoryId ?? null);
  const [priority, setPriority] = useState(String(rule?.priority ?? 100));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return toast.error('Chọn danh mục');
    setSaving(true);
    try {
      const payload = { pattern, matchType, categoryId, priority: Number(priority) || 100 };
      if (rule) await updateRule(rule.id, payload);
      else await createRule(payload);
      toast.success('Đã lưu quy tắc');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={rule ? 'Sửa quy tắc' : 'Thêm quy tắc'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['CONTAINS', 'Chứa từ khóa'],
              ['REGEX', 'Biểu thức (regex)'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMatchType(k)}
              aria-pressed={matchType === k}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                matchType === k ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-text-secondary hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">
            {matchType === 'CONTAINS' ? 'Từ khóa (ngăn cách bằng dấu phẩy)' : 'Biểu thức chính quy'}
          </span>
          <input
            className="input-field font-mono"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={matchType === 'CONTAINS' ? 'GRAB, XANH SM, BE GROUP' : 'CK DEN .* (ME|BO)'}
            autoFocus
          />
          <span className="block text-xs text-text-muted mt-1">
            {matchType === 'CONTAINS'
              ? 'Khớp nguyên cụm từ, không phân biệt hoa thường/dấu. VD "GRAB" khớp "GRAB*123" nhưng không khớp "GRABFOOD".'
              : 'Chạy trên nội dung đã bỏ dấu và viết HOA, không phân biệt hoa thường.'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block col-span-2">
            <span className="block text-xs font-medium text-text-secondary mb-1">Danh mục</span>
            <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} placeholder="Chọn danh mục…" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-text-secondary mb-1">Ưu tiên</span>
            <input type="number" min={0} className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-text-muted">
          Quy tắc chỉ áp dụng cho giao dịch cùng loại với danh mục (danh mục chi → tiền ra, danh mục thu → tiền vào).
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
