'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/shared/Modal';
import CategorySelect from '@/components/shared/CategorySelect';
import { errorMessage } from '@/lib/api-client';
import type { CategoryDTO } from '@/modules/finance/categories/types';
import { updateTransaction } from '@/modules/finance/transactions/lib';
import type { TransactionDTO } from '@/modules/finance/transactions/types';
import { normalizeText } from '@/lib/text';
import { createRule, reapplyRules, updateRule, useRules } from '../lib';
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
  const [onlyThisAccount, setOnlyThisAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: rules = [] } = useRules();

  // Quy tắc có sẵn cùng từ khóa + cùng phạm vi tài khoản → lưu sẽ cập nhật danh mục của nó thay vì tạo bản trùng
  const scopeAccountId = onlyThisAccount ? transaction.accountId : null;
  const existing = rules.find(
    (r) => r.matchType === 'CONTAINS' && normalizeText(r.pattern) === normalizeText(pattern.trim()) && (r.accountId ?? null) === scopeAccountId,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim()) return toast.error('Nhập từ khóa');
    if (!categoryId) return toast.error('Chọn danh mục');
    setSaving(true);
    try {
      if (existing) {
        await updateRule(existing.id, { categoryId, isActive: true });
      } else {
        await createRule({ pattern: pattern.trim(), matchType: 'CONTAINS', categoryId, priority: 50, accountId: scopeAccountId });
      }
      // Giao dịch hiện tại được gán luôn (kể cả khi nó đã được phân loại trước đó)
      await updateTransaction(transaction.id, { categoryId });
      if (applyExisting) {
        const r = await reapplyRules(false);
        toast.success(`${existing ? 'Đã cập nhật quy tắc' : 'Đã tạo quy tắc'} và phân loại thêm ${r.changed} giao dịch`);
      } else {
        toast.success(existing ? 'Đã cập nhật quy tắc có sẵn' : 'Đã tạo quy tắc');
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
          {existing && (
            <span className="block text-xs text-amber-700 mt-1">
              Từ khóa này đã có quy tắc (→ {existing.category.name}). Lưu sẽ cập nhật danh mục của quy tắc đó, không tạo thêm bản trùng.
            </span>
          )}
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
          <input type="checkbox" checked={onlyThisAccount} onChange={(e) => setOnlyThisAccount(e.target.checked)} />
          <span>
            Chỉ áp dụng cho giao dịch của <b className="text-text">{transaction.account.name}</b>
          </span>
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
            {saving ? 'Đang lưu…' : existing ? 'Cập nhật quy tắc' : 'Tạo quy tắc'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
