'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/shared/Modal';
import CategorySelect from '@/components/shared/CategorySelect';
import { errorMessage } from '@/lib/api-client';
import type { CategoryDTO } from '@/modules/categories/types';
import { updateTransaction } from '@/modules/transactions/lib';
import type { TransactionDTO } from '@/modules/transactions/types';
import { createRule, reapplyRules } from '../lib';
import { suggestKeyword } from '../utils/suggest-keyword';

interface Props {
  transaction: TransactionDTO | null;
  categories: CategoryDTO[];
  onClose: () => void;
  onDone: () => void;
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
      await createRule({ pattern: pattern.trim(), matchType: 'CONTAINS', categoryId, priority: 50 });
      // Giao dịch hiện tại được gán luôn (kể cả khi nó đã được phân loại trước đó)
      await updateTransaction(transaction.id, { categoryId });
      if (applyExisting) {
        const r = await reapplyRules(false);
        toast.success(`Đã tạo quy tắc và phân loại thêm ${r.changed} giao dịch`);
      } else {
        toast.success('Đã tạo quy tắc');
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
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
