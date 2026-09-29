'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/shared/Modal';
import CategorySelect from '@/components/shared/CategorySelect';
import { api } from '@/lib/client';
import { normalizeText } from '@/lib/text';
import type { CategoryDTO, TransactionDTO } from '@/lib/types';

interface Props {
  transaction: TransactionDTO | null;
  categories: CategoryDTO[];
  onClose: () => void;
  onDone: () => void;
}

// Gợi ý từ khóa: bỏ các từ chung chung của nội dung chuyển khoản, lấy 2 từ có nghĩa đầu tiên
const STOP = new Set(['CK', 'CHUYEN', 'TIEN', 'DEN', 'TU', 'THANH', 'TOAN', 'CHO', 'NOI', 'DUNG', 'GD', 'MBVCB', 'IBFT', 'FT', 'TRANSFER', 'QR', 'DON', 'HANG']);
function suggestKeyword(content: string): string {
  const words = normalizeText(content)
    .split(/[^A-Z0-9.!&-]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w));
  return words.slice(0, 2).join(' ');
}

export default function RuleFromTxnModal(props: Props) {
  if (!props.transaction) return null;
  return <Inner key={props.transaction.id} {...props} transaction={props.transaction} />;
}

function Inner({ transaction, categories, onClose, onDone }: Props & { transaction: TransactionDTO }) {
  const [pattern, setPattern] = useState(suggestKeyword(transaction.content));
  const [categoryId, setCategoryId] = useState<number | null>(transaction.categoryId);
  const [applyExisting, setApplyExisting] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim()) return toast.error('Nhập từ khóa');
    if (!categoryId) return toast.error('Chọn danh mục');
    setSaving(true);
    try {
      await api('/api/rules', {
        method: 'POST',
        body: JSON.stringify({ pattern: pattern.trim(), matchType: 'CONTAINS', categoryId, priority: 50 }),
      });
      // Giao dịch hiện tại được gán luôn (kể cả khi nó đã được phân loại trước đó)
      await api(`/api/transactions/${transaction.id}`, { method: 'PATCH', body: JSON.stringify({ categoryId }) });
      if (applyExisting) {
        const r = await api<{ changed: number }>('/api/rules/reapply', {
          method: 'POST',
          body: JSON.stringify({ includeRuleCategorized: false }),
        });
        toast.success(`Đã tạo quy tắc và phân loại thêm ${r.changed} giao dịch`);
      } else {
        toast.success('Đã tạo quy tắc');
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Tạo quy tắc từ giao dịch" size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl bg-surface-light px-3 py-2 text-sm text-text break-words">{transaction.content}</p>
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">
            Từ khóa (nhiều từ khóa ngăn cách bằng dấu phẩy)
          </span>
          <input className="input-field" value={pattern} onChange={(e) => setPattern(e.target.value)} autoFocus />
          <span className="block text-xs text-text-muted mt-1">
            Khớp nguyên cụm từ, không phân biệt hoa thường và dấu tiếng Việt.
          </span>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">Gán vào danh mục</span>
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            direction={transaction.direction}
            placeholder="Chọn danh mục…"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={applyExisting} onChange={(e) => setApplyExisting(e.target.checked)} />
          Áp dụng cho các giao dịch cũ chưa phân loại
        </label>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
            {saving ? 'Đang lưu…' : 'Tạo quy tắc'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
